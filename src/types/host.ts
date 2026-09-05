/**
 * Portable Host surface types. Value types (`Uri`) and helpers stay in host.ts
 * so a desktop host can implement this file's interfaces without vscode.
 */
import type { MementoLike } from "../session/persisted-state";
import type { PanelPosition } from "../view-move";
import type { Uri } from "../host";

export interface HostPosition {
  line: number;
  character: number;
}

export interface HostRange {
  start: HostPosition;
  end: HostPosition;
}

/** Options for opening a text document / diff tab (portable stand-in for
 *  `TextDocumentShowOptions`). */
export interface HostTextShowOptions {
  preview?: boolean;
  preserveFocus?: boolean;
  selection?: HostRange;
}

export interface HostDisposable {
  dispose(): void;
}

export interface HostTextEditor {
  document: { uri: Uri };
  selection: {
    isEmpty: boolean;
    start: HostPosition;
    end: HostPosition;
  };
}

export interface HostConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

export interface HostTextDocumentContentProvider {
  provideTextDocumentContent(uri: Uri): string;
}

export interface HostFileSystemWatcher extends HostDisposable {
  onDidCreate(listener: () => void): HostDisposable;
  onDidChange(listener: () => void): HostDisposable;
  onDidDelete(listener: () => void): HostDisposable;
}

/** Webview surface the sidebar needs — Electron implements this over IPC. */
export interface HostWebview {
  html: string;
  options: {
    enableScripts?: boolean;
    /**
     * Resource roots the webview may load from. Must stay as portable {@link Uri}
     * values — extension/media assets on a remote host are `vscode-remote://…`,
     * and flattening them to paths then rebuilding with `file://` breaks the
     * panel. Genuinely local roots (staging dirs, grok home) use {@link Uri.file}.
     */
    localResourceRoots?: Uri[];
  };
  readonly cspSource: string;
  postMessage(message: unknown): Thenable<boolean>;
  onDidReceiveMessage(listener: (message: unknown) => unknown): HostDisposable;
  /**
   * Convert a resource URI into one the webview can fetch. Pass the portable
   * {@link Uri} as-is — never a bare path string (remote schemes must survive).
   */
  asWebviewUri(uri: Uri): string;
}

export interface HostWebviewView {
  webview: HostWebview;
  show?(preserveFocus?: boolean): void;
}

/** Editor-area webview tab (VS Code settings). Desktop does not implement this. */
export interface HostEditorWebview extends HostDisposable {
  readonly webview: HostWebview;
  reveal(): void;
  onDidDispose(listener: () => void): HostDisposable;
}

export interface HostSecrets {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

/**
 * Slice of extension lifecycle state the sidebar actually uses. URI identity
 * is preserved for extension install + durable storage (remote hosts use
 * `vscode-remote://…`); a production flag instead of `ExtensionMode`.
 */
export interface HostContext {
  secrets: HostSecrets;
  /**
   * Extension-owned durable storage root. Keep as {@link Uri} so plan-review
   * writes via {@link HostFileSystem} target the same filesystem VS Code gave
   * us (remote hosts are not `file://`).
   */
  globalStorageUri: Uri;
  /**
   * Extension install root. Keep as {@link Uri} so webview media assets resolve
   * on remote hosts (`vscode-remote://…`), not a rebuilt `file://` path.
   */
  extensionUri: Uri;
  extensionId: string;
  extensionVersion: string;
  /** True when running a production install (not Extension Development / Test). */
  isProduction: boolean;
  /**
   * True only for the build made to run as a CLOUD ENVIRONMENT.
   *
   * Such a build is packaged — `isProduction` is also true — but has no user at
   * a keyboard, so it is allowed to take its relay and its device token from the
   * environment. A VS Code extension is never one of these; the desktop app is
   * one only when packaged with the flag.
   */
  isCloudBuild?: boolean;
  globalState: MementoLike;
  subscriptions: { push(...items: HostDisposable[]): void };
}

// ── Config / dialogs ─────────────────────────────────────────────────────────

/** Where a configuration write should land. Mirrors VS Code's ConfigurationTarget. */
export type ConfigTarget = "global" | "workspace" | "workspaceFolder";

/** Result of `inspect` on a single configuration key — the fields the sidebar
 *  actually reads (voice per-repo scope, model heal on startup). */
export interface ConfigInspect<T> {
  key: string;
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}

/** One section of host configuration (`getConfiguration("grok")` or root). */
export interface HostConfiguration {
  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  update(section: string, value: unknown, target?: ConfigTarget): Thenable<void>;
  inspect<T>(section: string): ConfigInspect<T> | undefined;
}

export interface HostMessageOptions {
  modal?: boolean;
}

export interface HostQuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export interface HostQuickPickOptions {
  placeHolder?: string;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  title?: string;
}

export interface HostInputBoxOptions {
  prompt?: string;
  placeHolder?: string;
  ignoreFocusOut?: boolean;
  value?: string;
  password?: boolean;
  title?: string;
}

export interface HostOpenDialogOptions {
  canSelectFiles?: boolean;
  canSelectFolders?: boolean;
  canSelectMany?: boolean;
  openLabel?: string;
  /** Absolute path to open the dialog at, when the host supports it. */
  defaultPath?: string;
  filters?: Record<string, string[]>;
}

export interface HostSaveDialogOptions {
  /** Absolute default path (directory + filename). */
  defaultPath?: string;
  filters?: Record<string, string[]>;
  saveLabel?: string;
  title?: string;
}

export interface HostTerminalOptions {
  name: string;
  shellPath?: string;
  shellArgs?: string[];
  cwd?: string;
}

export interface HostTerminal {
  show(preserveFocus?: boolean): void;
  sendText(text: string, addNewLine?: boolean): void;
  dispose(): void;
}

export interface HostProgressOptions {
  title: string;
  /** When true the host exposes a cancel affordance; the task receives a token. */
  cancellable?: boolean;
}

/** Cancellation surface for long-running host progress (e.g. device-link poll). */
export interface HostCancellationToken {
  readonly isCancellationRequested: boolean;
}

/**
 * Minimal filesystem surface the agent + plan-review paths need.
 * Takes portable {@link Uri} so storage-relative addresses (remote
 * `globalStorageUri` children) keep scheme/authority; genuinely local disk
 * paths use {@link Uri.file}. The adapter must convert only via `toVsCodeUri`.
 */
export interface HostFileSystem {
  readFile(uri: Uri): Promise<Uint8Array>;
  writeFile(uri: Uri, content: Uint8Array): Promise<void>;
  createDirectory(uri: Uri): Promise<void>;
  delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  stat(uri: Uri): Promise<{ type: number; ctime: number; mtime: number; size: number }>;
}

/**
 * Everything effectful that the session/UI controller needs from its host.
 * A VS Code build supplies {@link createVsCodeHost}; a desktop build supplies
 * its own.
 */
export interface Host {
  /** Surface identity used by shared UI logic for host-specific affordances. */
  readonly hostKind?: "extension" | "desktop";
  // ── Notifications ──────────────────────────────────────────────────────
  showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  showWarningMessage(
    message: string,
    ...items: Array<string | HostMessageOptions>
  ): Thenable<string | undefined>;
  showErrorMessage(
    message: string,
    ...items: Array<string | HostMessageOptions>
  ): Thenable<string | undefined>;

  // ── Dialogs / pickers ──────────────────────────────────────────────────
  showQuickPick<T extends HostQuickPickItem>(
    items: readonly T[],
    options?: HostQuickPickOptions,
  ): Thenable<T | undefined>;
  showInputBox(options?: HostInputBoxOptions): Thenable<string | undefined>;
  /** Returns absolute filesystem paths (empty array / undefined = cancelled). */
  showOpenDialog(options?: HostOpenDialogOptions): Thenable<string[] | undefined>;
  /** Returns an absolute filesystem path, or undefined if cancelled. */
  showSaveDialog(options?: HostSaveDialogOptions): Thenable<string | undefined>;

  // ── Configuration ──────────────────────────────────────────────────────
  /**
   * Read a configuration section. `resourcePath` scopes the lookup to a folder
   * (VS Code: `getConfiguration(section, Uri.file(resourcePath))`); omit for
   * the default/workspace scope.
   */
  getConfiguration(section?: string, resourcePath?: string): HostConfiguration;

  // ── Commands / external ────────────────────────────────────────────────
  openExternal(url: string): Thenable<boolean>;
  /**
   * Open the host settings UI, optionally focused on a configuration section
   * (e.g. `"grok.voiceApiKey"`). VS Code: `workbench.action.openSettings`.
   */
  openSettings(section?: string): Thenable<void>;
  /**
   * Start the AFK Pilot / remote device-link flow. On VS Code this runs the
   * contributed `grok.linkRemote` command; a desktop host implements linking
   * natively without emulating VS Code command IDs.
   */
  linkRemote(): Thenable<void>;
  /** Unlink this device from AFK Pilot / remote access (symmetric to {@link linkRemote}). */
  unlinkRemote(): Thenable<void>;

  // ── Terminals ──────────────────────────────────────────────────────────
  createTerminal(nameOrOptions: string | HostTerminalOptions): HostTerminal;

  // ── Progress ───────────────────────────────────────────────────────────
  withProgress<T>(
    options: HostProgressOptions,
    task: (cancellationToken: HostCancellationToken) => Thenable<T>,
  ): Thenable<T>;

  // ── Output / logging ───────────────────────────────────────────────────
  /** Append without a trailing newline (mirrors OutputChannel.append). */
  append(text: string): void;
  appendLine(line: string): void;
  showOutput(preserveFocus?: boolean): void;
  /**
   * Toggle Chromium DevTools on the chat surface. Unpackaged desktop only;
   * no-op for VS Code and packaged builds. Wired to gear → Advanced so
   * discoverability does not depend on an auto-hidden application menu.
   */
  toggleDevTools(): void;
  /**
   * Quit and install a downloaded desktop update. Optional: VS Code has no
   * updater; desktop wires this to electron-updater's quitAndInstall.
   */
  installAppUpdate?(): void;

  // ── Filesystem ─────────────────────────────────────────────────────────
  readonly fs: HostFileSystem;

  // ── Workspace ──────────────────────────────────────────────────────────
  /** Absolute path of the active workspace folder, if any. */
  workspaceRoot(): string | undefined;
  /**
   * Every open workspace folder root. Desktop multi-folder returns several;
   * VS Code returns the window's folders (often one). Empty when none open.
   */
  workspaceFolders(): string[];
  /**
   * Make `cwd` the active workspace folder. Must already be open (see
   * {@link workspaceFolders}). Returns false when the host refuses (unknown /
   * not-open path). VS Code no-ops and returns true (the window *is* the
   * workspace — folder switching is not a surface). Callers must **abort**
   * on false rather than treating the call as advisory.
   */
  setActiveWorkspaceFolder(cwd: string): boolean;
  /**
   * Open an additional folder (desktop multi-folder). Returns false when the
   * host cannot add folders or the path is invalid.
   */
  addWorkspaceFolder(cwd: string): boolean;
  /**
   * Close an open folder. Returns false when refused (last folder, unknown
   * path, or host does not manage folders).
   */
  removeWorkspaceFolder(cwd: string): boolean;
  /**
   * Relative path from the workspace (multi-root-aware).
   * Pass a portable {@link Uri} so remote schemes (`vscode-remote://…`) keep
   * their identity — a bare path string cannot match remote workspace folders
   * and falls through to the absolute path.
   */
  asRelativePath(uri: Uri): string;
  /**
   * Find files under the workspace (or under `include.base` when given a
   * relative-pattern shape). Returns portable URIs so callers can pass them
   * to {@link asRelativePath} without losing scheme/authority.
   */
  findFiles(
    include: string | { base: string; pattern: string },
    exclude?: string,
    maxResults?: number,
  ): Thenable<Uri[]>;
  /** Whether `fsPath` belongs to an open workspace folder (matched by path). */
  isInWorkspace(fsPath: string): boolean;

  // ── Editor ─────────────────────────────────────────────────────────────
  getActiveTextEditor(): HostTextEditor | undefined;
  /**
   * Open a filesystem path as a text document, optionally revealing a selection.
   * Throws when the host cannot open the file (caller may fall back to
   * {@link openResource}).
   */
  openTextFile(fsPath: string, options?: HostTextShowOptions): Thenable<void>;
  /**
   * Open a path or portable URI with the host's default handler (binary-safe;
   * maps to `vscode.open` on VS Code). Prefer {@link openTextFile} when a
   * line selection is needed.
   *
   * On desktop, filesystem paths are revalidated against workspace roots
   * (renderer-supplied openFile). For host-known locations use the typed
   * intent methods below — never funnel those through this path.
   */
  openResource(target: string | Uri, options?: HostTextShowOptions): Thenable<void>;
  /** Reveal a host-resolved filesystem path in the host's file manager. */
  showInFolder(fsPath: string): Thenable<void>;
  /**
   * Open the user's global Grok config.toml (`~/.grok/config.toml` / GROK_HOME).
   * Host resolves and may create a stub; no renderer path is involved.
   */
  openGlobalConfig(): Thenable<void>;
  /**
   * Open the project-local `.grok/config.toml` under `projectCwd` (session /
   * workspace cwd from the host). Host resolves and may create a stub.
   */
  openProjectConfig(projectCwd: string): Thenable<void>;
  /**
   * Open a path the host itself resolved or created (e.g. an export under
   * globalStorage). Must never receive a path that originated from the
   * webview. Desktop skips workspace-root containment; VS Code opens normally.
   */
  openHostResolvedPath(fsPath: string): Thenable<void>;
  /**
   * Open an untitled document. Pass a language id to pin highlighting; omit it
   * so the editor can detect (never default the caller to plaintext).
   *
   * `suggestedFilename` is a save-as hint from an additive `openText.filename`.
   * Desktop honors it with the OS save dialog (cancel writes nothing). VS Code
   * ignores it and still opens an untitled tab. Omit it for command View all.
   */
  openUntitledText(content: string, language?: string, suggestedFilename?: string): Thenable<void>;
  /**
   * Open a side-by-side diff of two portable URIs (content-provider or file).
   */
  openDiff(
    left: Uri,
    right: Uri,
    title: string,
    options?: HostTextShowOptions,
  ): Thenable<void>;
  /**
   * Currently open workspace text tabs as `{rel, abs}` (file scheme only,
   * inside a workspace folder). Used by `@`-mention merge.
   */
  openWorkspaceTextFiles(): Array<{ rel: string; abs: string }>;
  /**
   * Close any diff editor tab whose original/modified URIs match the given
   * portable URIs. The host converts both sides through one encoder before
   * comparing — callers must not pass pre-stringified URIs.
   */
  closeDiffTabs(original: Uri, modified: Uri): void;

  // ── Context keys / view placement ──────────────────────────────────────
  /** Set a when-clause context key (VS Code: `setContext`). */
  setContext(key: string, value: unknown): Thenable<void>;
  /**
   * Move `viewId` into a contribution container and focus it. When
   * `destinationId` is null/undefined, open the host's move-view picker
   * preselected on that view.
   *
   * `panelPosition` docks the panel on that edge before revealing — for the
   * destinations whose label promises an edge ("To Right Panel"). Null leaves
   * the workbench layout untouched, which is what every pre-existing
   * destination passes.
   */
  relocateView(
    viewId: string,
    destinationId?: string | null,
    panelPosition?: PanelPosition | null,
  ): Thenable<void>;
  /**
   * Bring the chat into view. Called when someone opens a conversation from the
   * PROJECTS rail, which lives in its own activity-bar container — so without
   * this the chat can stay behind another view and the click reads as having
   * done nothing.
   *
   * A no-op wherever the chat is always on screen: the desktop app has one
   * window and no view containers. Must never throw — failing to focus a view
   * cannot be allowed to fail opening the conversation.
   */
  revealChatView(): Thenable<void>;

  // ── Watchers / providers ───────────────────────────────────────────────
  onDidChangeConfiguration(
    listener: (e: HostConfigurationChangeEvent) => void,
  ): HostDisposable;
  onDidChangeActiveTextEditor(listener: () => void): HostDisposable;
  /**
   * Fires when the *active* editor's selection changes (split editors that
   * are not active are filtered out by the host).
   */
  onDidChangeActiveTextEditorSelection(listener: () => void): HostDisposable;
  /**
   * Watch a single file: `base` is an absolute directory, `pattern` a
   * relative glob (typically a basename like `auth.json`).
   */
  createFileSystemWatcher(base: string, pattern: string): HostFileSystemWatcher;
  registerTextDocumentContentProvider(
    scheme: string,
    provider: HostTextDocumentContentProvider,
  ): HostDisposable;

  // ── Env metadata ───────────────────────────────────────────────────────
  readonly appName: string;
  readonly language: string;
  readonly isTelemetryEnabled: boolean;

  // ── Host-kind capabilities (declared at the ownership boundary) ────────
  /**
   * When true, a second webview `ready` rehydrates from the live session buffer
   * instead of starting a new session process. True only for hosts whose
   * document can reload under a live process (Electron). **False for VS Code**
   * — view moves / "Reload Webviews" dispose and recreate the webview and must
   * keep the v3.1.0 startSession path (never rehydrate by construction).
   */
  readonly webviewReloadsUnderLiveSession: boolean;
  /**
   * Suffix appended to the install id when talking to the AFK Pilot relay on
   * device link. Empty for VS Code; `":desktop"` for the desktop app so the
   * relay shares one device-cap slot with the same machine's VS Code install.
   * Anything other than a bare id or `<id>:desktop` is rejected by the relay.
   */
  readonly remoteInstallIdSuffix: string;
  /**
   * Gear → Move view. Wired into `initialState.capabilities.relocateView`.
   * Client treats absent/true as supported (older extensions); only false
   * hides the item — desktop has no view containers.
   */
  readonly canRelocateView: boolean;
  /**
   * Whether gear → Move view may offer the SECONDARY SIDE BAR. Cursor 3.15
   * refuses extension containers there — it is reserved for its own agent UI —
   * so the destination silently does nothing; the menu offers the panel by
   * edge instead. Read at initialState time, so implementations that resolve
   * this asynchronously must default to true (the pre-Cursor truth) rather
   * than to false.
   */
  readonly canUseSecondarySideBar: boolean;
  /**
   * Gear → Show extension logs. Same opt-out polarity as canRelocateView;
   * desktop is false (stdout only).
   */
  readonly canShowOutput: boolean;
  /**
   * Gear → Toggle Developer Tools. OPT-IN: absent/false = hide. True only for
   * unpackaged desktop builds (`!app.isPackaged`); packaged and VS Code are false.
   */
  readonly canToggleDevTools: boolean;
  /**
   * Settings → Connectors. OPT-IN: absent/false = hide the nav row.
   * Desktop and VS Code set true; the webview still reads
   * `capabilities.mcpSettings` so an older host can omit the page.
   */
  readonly canShowMcpSettings: boolean;
  /**
   * Whether clicking a generated image (or the media hover "open" action's
   * sibling click-to-enlarge path) should open a host editor tab via
   * `openFile`. Wired into `initialState.capabilities.openInEditor`. Opt-out
   * polarity on the wire: absent/true = editor host (VS Code); false =
   * no editor (desktop — open the in-app lightbox instead). Remote clients
   * force the lightbox regardless: the caps they receive are the desk
   * machine's, and a phone must never open a desk editor.
   */
  readonly canOpenInEditor: boolean;
  /**
   * When true, the local webview may switch the active workspace folder via
   * the projects rail (`selectRepo` re-homes the local session). Desktop
   * multi-folder only; **false for VS Code** (window already is the repo).
   */
  readonly canSwitchWorkspaceFolder: boolean;
  /**
   * When true, project rows carry archive fields and the rail may show Project
   * Archive + per-project archive actions. Meaningful only where the list is
   * discovered and cannot be closed (VS Code). **False for desktop** — the
   * open set is curated via Add/Close Project Folder; archive would duplicate
   * that. Capability, not host-name: a remote client follows whatever host it
   * is attached to (field presence on `repos` rows is the wire signal).
   */
  readonly canArchiveRepos: boolean;
  /**
   * Whether generated media is served with honest byte ranges. Only hosts that
   * own the media handler may advertise this to the webview.
   */
  readonly canServeMediaRanges: boolean;
  /** Whether the host can reveal a filesystem path in its file manager. */
  readonly canShowInFolder: boolean;
  /**
   * Whether View-all text and proposed diffs should open the in-app preview
   * overlay. Wired into `initialState.capabilities.previewInApp`. OPT-IN:
   * absent/false = host editor or window (VS Code tabs; older desktop
   * viewers). True only for the desktop app.
   */
  readonly canPreviewInApp: boolean;
  /**
   * Whether gear → Settings should open an editor-area webview tab.
   * Wired into `initialState.capabilities.settingsEditor`. OPT-IN: true only
   * for VS Code. Desktop and remotes keep the in-page overlay.
   */
  readonly canOpenSettingsEditor: boolean;
  /**
   * Open (or create) an editor-area webview tab. VS Code implements this;
   * desktop returns undefined because settings live in the chat overlay there.
   */
  openEditorWebview(opts: {
    viewType: string;
    title: string;
    localResourceRoots: Uri[];
  }): HostEditorWebview | undefined;
}
