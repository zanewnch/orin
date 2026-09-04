/**
 * Effectful host surface that `sidebar.ts` talks to instead of calling the
 * VS Code API directly.
 *
 * This is the seam for a non-VS-Code host (desktop Electron app): inject an
 * implementation that maps these methods onto native notifications, dialogs,
 * filesystem, config store, etc. The interface deliberately does **not** import
 * `vscode` — a desktop host must be able to implement it (and load `sidebar.ts`)
 * without the VS Code module present at all.
 *
 * Boundary: effectful calls + portable value types. The VS Code host converts
 * {@link Uri} / show options back to real `vscode.*` values at the seam
 * (diff tabs, content providers, open-resource). Operations a desktop host
 * must implement are typed methods on this interface — never VS Code command IDs.
 */

import * as path from "node:path";

// ── Portable value types ─────────────────────────────────────────────────────

/**
 * Lightweight URI for the portable side. Same role as `vscode.Uri` at call
 * sites (`Uri.file`, custom-scheme diffs, content-provider keys) without
 * pulling in the VS Code module.
 *
 * Chosen over plain path strings because diff preview needs non-file schemes
 * (`grok-diff:/…`) that must round-trip through {@link Host.openDiff} and
 * content-provider keys. The VS Code host rebuilds a real `vscode.Uri` at the
 * adapter boundary via a single encoder (`toVsCodeUri`) so comparisons never
 * mix portable and VS Code string forms.
 */
const URI_BRAND = Symbol.for("grok.host.Uri");

/** Percent-encode a URI path (keep `/` separators; encode each segment). */
function encodeUriPath(uriPath: string): string {
  return uriPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/** Encode query/fragment for href (keep `=`/`&` readable in queries). */
function encodeUriQuery(query: string): string {
  return encodeURIComponent(query)
    .replace(/%3D/gi, "=")
    .replace(/%26/g, "&");
}

function buildHref(
  scheme: string,
  authority: string,
  uriPath: string,
  query = "",
  fragment = "",
): string {
  const encPath = encodeUriPath(uriPath);
  let href: string;
  if (authority) {
    const withSlash = encPath.startsWith("/") ? encPath : `/${encPath}`;
    href = `${scheme}://${authority}${withSlash}`;
  } else {
    href = `${scheme}:${encPath}`;
  }
  if (query) href += `?${encodeUriQuery(query)}`;
  if (fragment) href += `#${encodeURIComponent(fragment)}`;
  return href;
}

export class Uri {
  readonly [URI_BRAND] = true as const;
  readonly scheme: string;
  /** Host/authority component (e.g. remote host for `vscode-remote://host/…`). */
  readonly authority: string;
  /** Path component (POSIX-style for file URIs, including leading `/C:` on Windows). */
  readonly path: string;
  /**
   * Query string without the leading `?` (same contract as `vscode.Uri.query`).
   */
  readonly query: string;
  /**
   * Fragment without the leading `#` (same contract as `vscode.Uri.fragment`).
   */
  readonly fragment: string;
  /**
   * Filesystem path. For `file:` this is the OS path; for other schemes it is
   * whatever the host supplied (VS Code's real `fsPath`), not a derived guess.
   */
  readonly fsPath: string;
  private readonly _href: string;

  private constructor(
    scheme: string,
    authority: string,
    uriPath: string,
    fsPath: string,
    href: string,
    query = "",
    fragment = "",
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = uriPath;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = fsPath;
    this._href = href;
  }

  static file(fsPath: string): Uri {
    const normalized = fsPath.replace(/\\/g, "/");
    const uriPath = /^[A-Za-z]:/.test(normalized)
      ? `/${normalized}`
      : normalized.startsWith("/")
        ? normalized
        : `/${normalized}`;
    return new Uri("file", "", uriPath, fsPath, buildHref("file", "", uriPath));
  }

  static from(components: {
    scheme: string;
    path: string;
    authority?: string;
    query?: string;
    fragment?: string;
    /** Real host fsPath when known (non-file schemes); otherwise derived from path. */
    fsPath?: string;
  }): Uri {
    const scheme = components.scheme;
    const authority = components.authority ?? "";
    const uriPath = components.path;
    const query = components.query ?? "";
    const fragment = components.fragment ?? "";
    if (scheme === "file" && !authority && !query && !fragment) {
      // Strip the leading slash before a Windows drive letter.
      const fsPath = components.fsPath
        ?? (/^\/[A-Za-z]:/.test(uriPath) ? uriPath.slice(1) : uriPath);
      return Uri.file(fsPath.replace(/\//g, path.sep));
    }
    const fsPath =
      components.fsPath
      ?? (scheme === "file" && /^\/[A-Za-z]:/.test(uriPath)
        ? uriPath.slice(1).replace(/\//g, path.sep)
        : scheme === "file"
          ? uriPath.replace(/\//g, path.sep)
          : uriPath);
    return new Uri(
      scheme,
      authority,
      uriPath,
      fsPath,
      buildHref(scheme, authority, uriPath, query, fragment),
      query,
      fragment,
    );
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    if (base.scheme === "file") {
      return Uri.file(path.join(base.fsPath, ...pathSegments));
    }
    const joined = [base.path.replace(/\/$/, ""), ...pathSegments]
      .filter((s) => s.length > 0)
      .join("/")
      .replace(/\/{2,}/g, "/");
    const uriPath = joined.startsWith("/") ? joined : `/${joined}`;
    const fsPath =
      base.fsPath && pathSegments.length > 0
        ? path.join(base.fsPath, ...pathSegments)
        : base.fsPath;
    // joinPath rebuilds the path; query/fragment do not carry (matches vscode.Uri.joinPath).
    return Uri.from({
      scheme: base.scheme,
      authority: base.authority,
      path: uriPath,
      fsPath,
    });
  }

  toString(): string {
    return this._href;
  }
}

export function isHostUri(value: unknown): value is Uri {
  return typeof value === "object" && value !== null && (value as { [URI_BRAND]?: boolean })[URI_BRAND] === true;
}

/** path.win32 on Windows, path.posix elsewhere — so case rules and separators
 *  follow the *target* platform even when unit tests inject `platform`. */
function pathForPlatform(platform: NodeJS.Platform): path.PlatformPath {
  return platform === "win32" ? path.win32 : path.posix;
}

/**
 * Normalize a session/workspace fs path for containment checks.
 *
 * Uses path.normalize (resolves `.` / `..`, unifies separators) rather than
 * path.resolve, so a remote POSIX path like `/home/me/proj` is not rewritten
 * onto the host drive when the extension host is Windows. Case-folds only on
 * Windows — Linux and case-sensitive macOS volumes keep distinct `/Project`
 * vs `/project` roots.
 */
export function normalizeWorkspaceFsPath(
  fsPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const pathMod = pathForPlatform(platform);
  let normalized = pathMod.normalize((fsPath || "").trim());
  if (normalized !== pathMod.parse(normalized).root) {
    normalized = normalized.replace(/[\\/]+$/, "");
  }
  if (platform === "win32") normalized = normalized.toLowerCase();
  return normalized;
}

/**
 * True when `fsPath` is equal to, or lives under, any of `folderFsPaths`
 * (segment-boundary safe via path.relative). Pure — used by the VS Code
 * host's {@link Host.isInWorkspace} and unit-tested without vscode.
 */
export function isFsPathInWorkspace(
  fsPath: string,
  folderFsPaths: readonly string[],
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!folderFsPaths.length) return false;
  const pathMod = pathForPlatform(platform);
  const target = normalizeWorkspaceFsPath(fsPath, platform);
  if (!target) return false;
  return folderFsPaths.some((root) => {
    const r = normalizeWorkspaceFsPath(root, platform);
    if (!r) return false;
    if (target === r) return true;
    const rel = pathMod.relative(r, target);
    return rel !== "" && !rel.startsWith("..") && !pathMod.isAbsolute(rel);
  });
}

export type {
  ConfigInspect,
  ConfigTarget,
  Host,
  HostCancellationToken,
  HostConfiguration,
  HostConfigurationChangeEvent,
  HostContext,
  HostDisposable,
  HostEditorWebview,
  HostFileSystem,
  HostFileSystemWatcher,
  HostInputBoxOptions,
  HostMessageOptions,
  HostOpenDialogOptions,
  HostPosition,
  HostProgressOptions,
  HostQuickPickItem,
  HostQuickPickOptions,
  HostRange,
  HostSaveDialogOptions,
  HostSecrets,
  HostTerminal,
  HostTerminalOptions,
  HostTextDocumentContentProvider,
  HostTextEditor,
  HostTextShowOptions,
  HostWebview,
  HostWebviewView,
} from "./types/host";
import type { HostDisposable } from "./types/host";

/** Combine several disposables the way `vscode.Disposable.from` does. */
export function disposeAll(...items: HostDisposable[]): HostDisposable {
  return {
    dispose() {
      for (const item of items) {
        try {
          item.dispose();
        } catch {
          /* best-effort */
        }
      }
    },
  };
}
/**
 * Decide whether a webview `ready` should rehydrate a live session instead of
 * startSession. Capability is host-declared; `hasLiveClient` is only "is there
 * something to reattach" on hosts that allow reload — never a proxy for host kind.
 */
export function shouldRehydrateOnWebviewReady(
  webviewReloadsUnderLiveSession: boolean,
  hasLiveClient: boolean,
): boolean {
  return webviewReloadsUnderLiveSession && hasLiveClient;
}

/**
 * Form the install id sent to the AFK Pilot relay. Bare UUID for VS Code;
 * `<uuid>:desktop` for the desktop app.
 */
export function formatRemoteInstallId(baseId: string, suffix: string): string {
  if (!suffix) return baseId;
  return baseId.endsWith(suffix) ? baseId : baseId + suffix;
}

/**
 * Options for an untitled document. Omits `language` when unset so the editor
 * can detect — passing `language: undefined` (or defaulting to plaintext)
 * pins Plain Text and blocks detection.
 */
export function untitledTextOpenOptions(
  content: string,
  language?: string,
): { content: string; language?: string } {
  return language ? { content, language } : { content };
}
