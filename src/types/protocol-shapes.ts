// Payload shapes for the host <-> webview contract.
// Discriminated unions live in types/protocol-host.ts / types/protocol-webview.ts;
// src/protocol.ts remains the import path (maps + re-exports).

import type { FileChip } from "../composer/chips";

/** grok's tool-call payload as it comes off the wire (acp emits it untyped). The
 *  webview reads a handful of fields; the index signature keeps assignment from
 *  the raw payload friction-free. */
export interface ToolCallPayload {
  toolCallId?: string;
  title?: string;
  status?: string;
  kind?: string;
  rawInput?: unknown;
  content?: unknown;
  /**
   * Host-normalized MCP argument text (`prepareMcpToolCall`). Always stated
   * on recognized MCP rows: a string shows IN (`{}` is a no-argument call);
   * `null` means pending (do not render an empty IN). Absent on non-MCP
   * rows and older hosts — the client must not invent IN from that absence.
   */
  detailInput?: string | null;
  [k: string]: unknown;
}

/** A single answered plan card replayed on session resume (planHistoryQueue). */
export interface PlanHistoryItem {
  text: string;
  verdict?: "approved" | "rejected" | "abandoned" | undefined;
  afterUserMessage?: number;
  afterInterjection?: number;
  afterHistoryEvent?: number;
  planPath?: string;
  planName?: string;
}

/** host -> webview */
export const HOST_CAPABILITIES = {
  uploadFile: true,
  remoteVoice: true,
  // Whether `deleteSession` can take the conversation the requester is READING.
  // Older hosts refuse it — the live CLI re-persisted the files the moment they
  // went, so the delete did not stick — and a client that offers the control
  // anyway is offering one that answers with a refusal. Capability, not version.
  deleteActiveSession: true,
  // Queued follow-ups carry their attachments. OPT-IN: absent/false = the
  // webview must not post `queueSend.chips` (a v2.0.4 host would ignore them
  // and silently drop the files). Field presence, not a version check.
  queueSendChips: true,
  // Read-only project file browse for AFK Pilot (phone/browser). Field presence
  // is the gate — never a version check. Local VS Code / desktop webviews
  // receive the flag but must not draw a second explorer; only IS_REMOTE clients
  // mount the in-page browser. Older hosts omit the field → nothing advertised.
  browseProjectFiles: true,
  // Edit+save existing project files from a remote. Separate from browse so a
  // host can offer list/read without a write path. OPT-IN field presence.
  editProjectFiles: true,
  // Whether this host can run an agent's headless sign-in for a remote and
  // report back the URL and code.
  //
  // OPT-IN, and load-bearing rather than tidy. The relay serves the web client,
  // so the client is always as new as the deploy while the extension is
  // whatever the user installed. Every host built before this shipped
  // classifies `runGrokLogin` as `host-local` and DROPS it — no error, no
  // reply, nothing. A client that offered Connect unconditionally would give
  // every 3.18.0 user a button that does nothing at all, which is worse than
  // the dead end it replaced, because a dead end at least tells you where to
  // go. Field presence, never a version check.
  remoteAgentSignIn: true,
  // Same shape, for GitHub in the clone form. Older hosts classify
  // `setupGithubCli` as `host-local` and drop it silently, so the Sign in
  // button must not be offered as a working control until this is present.
  remoteGithubSignIn: true,
  // Same shape again, for Rewind and Edit on user bubbles. Every host built
  // before 4.1.0 classifies `rewindSession` / `editLastMessage` /
  // `uiConfirmAnswer` as host-local and drops them, so a browser client — which
  // is always as new as the relay deploy — would show two controls that do
  // nothing at all for every user who has not updated yet. That window is not
  // hypothetical: the relay ships first, by release-order rule.
  remoteRewind: true,
} as const;

/** Device-code GitHub sign-in carried on `projectSetup`. Additive. */
export type ProjectSetupGithub = {
  status: "starting" | "waiting" | "done" | "failed";
  url?: string;
  code?: string;
  message?: string;
};

/**
 * GitHub connection snapshot. Field presence is the capability: an older host
 * never sends `githubState`, and the Settings row / clone picker stay hidden
 * rather than offering controls that host would drop.
 *
 * Never carries a token. `envTokenInForce` is whether this process has
 * `GH_TOKEN` or `GITHUB_TOKEN` set — not a gh credential-source string,
 * which is not portably readable.
 */
export type GithubState = {
  connected: boolean;
  login?: string;
  envTokenInForce?: boolean;
  error?: boolean;
  cliPresent?: boolean;
  message?: string;
  /** Live device-code card, when sign-in was started from Settings. */
  loginFlow?: ProjectSetupGithub;
};

export type GithubRepoView = {
  nameWithOwner: string;
  isPrivate: boolean;
  updatedAt: string;
};

/** Machine-readable `error.code` for a send abandoned after its userMessage echo. */
export const INTERRUPTED_SEND_CODE = "interrupted-send" as const;

/**
 * Machine-readable `error.code` when a remote tab lost a conversation to an
 * explicit claim from another tab, or when a non-claim resume found that
 * conversation already held. Additive: older clients ignore `code` and still
 * see `resumeFailed`.
 */
export const SESSION_SUPERSEDED_CODE = "session-superseded" as const;

export type HostErrorCode =
  | typeof INTERRUPTED_SEND_CODE
  | typeof SESSION_SUPERSEDED_CODE;

/** Host-kind affordances merged into `initialState.capabilities` at post time. */
export type HostUiCapabilities = {
  uploadFile: boolean;
  remoteVoice: boolean;
  deleteActiveSession?: boolean;
  /**
   * Read-only project file browse (list dir + read previewable files) for
   * remote clients. OPT-IN: absent/false = hide. Current hosts set true via
   * HOST_CAPABILITIES; the webview still only mounts UI when remote.
   */
  browseProjectFiles?: boolean;
  /**
   * Save edits to existing project text files from a remote client.
   * OPT-IN and independent of {@link browseProjectFiles}: a host may advertise
   * browse without edit. Absent/false = no write UI and no write path.
   * No create/delete/rename in this pass.
   */
  editProjectFiles?: boolean;
  /**
   * Whether this host can run an agent's headless sign-in on a remote's behalf.
   * OPT-IN: absent/false = the remote empty state falls back to "connect it at
   * your computer" instead of offering a control an older host would silently
   * drop. See HOST_CAPABILITIES for why silence is the failure mode.
   */
  remoteAgentSignIn?: boolean;
  /**
   * Whether this host can run `gh auth login` headlessly for a remote and
   * report the URL and code in the clone form. OPT-IN: absent/false = the
   * remote clone form keeps the honest dead-end rather than posting
   * `setupGithubCli` at a host that would drop it.
   */
  remoteGithubSignIn?: boolean;
  /**
   * Whether this host accepts Rewind and Edit from a remote. OPT-IN:
   * absent/false = the browser hides both controls rather than offering
   * buttons an older host drops in silence. See HOST_CAPABILITIES.
   */
  remoteRewind?: boolean;
  /**
   * Whether a remote may sign an agent OUT on this host.
   *
   * OPT-IN, and set only where the host IS a cloud environment. `logout` is
   * host-local everywhere else because it revokes a credential every surface on
   * that machine shares, and a phone must not be able to do that to somebody's
   * desk. A cloud environment has no other surface — the remote is the only way
   * in — so a credential you could grant and never revoke would be the worse
   * answer. Field presence, never a version check: a host that does not send it
   * keeps the read-only row.
   */
  remoteAgentSignOut?: boolean;
  /**
   * Settings → Connectors. OPT-IN: absent/false = hide the nav row and keep
   * the page unreachable. Desktop and VS Code set true; remotes inherit the
   * desk machine's capabilities. The webview still keys on this field so an
   * older host that never sent it keeps the page hidden.
   */
  mcpSettings?: boolean;
  /**
   * Whether generated media is served with honest byte-range responses. This
   * is opt-in: hosts without this capability must keep generated videos lazy.
   */
  servesMediaRanges?: boolean;
  /**
   * Gear → Move view. Opt-out: absent/true = show (older VS Code hosts never
   * sent this flag but always supported the control); false = hide (desktop).
   */
  relocateView?: boolean;
  /**
   * Whether gear → Move view may offer "To Secondary Side Bar". Same opt-out
   * polarity as relocateView, and for the same reason: every extension built
   * before Cursor refused that container sends nothing here and had one.
   * False swaps the two panel destinations for edge-explicit ones.
   */
  secondarySideBar?: boolean;
  /**
   * Show the empty-state hint pointing at the editor's own move-view picker.
   * OPT-IN — absent/false = no hint. Decided entirely by the host: it is true
   * only where the secondary side bar was refused AND the user has not yet
   * opened that picker from anywhere.
   */
  moveViewHint?: boolean;
  /**
   * Gear → Show extension logs. Same opt-out polarity as relocateView —
   * absent/true = show; false = hide (desktop logs to stdout only).
   */
  showOutput?: boolean;
  /**
   * Gear → Toggle Developer Tools. OPT-IN: absent/false = hide. Unpackaged
   * desktop only — never offered on VS Code or packaged builds.
   */
  toggleDevTools?: boolean;
  /**
   * Whether a generated-image click opens a host editor tab (`openFile`).
   * Opt-out: absent/true = yes (older VS Code hosts never sent this flag but
   * always opened editors); false = no editor — the webview uses the in-app
   * lightbox instead (desktop). Remote clients force the lightbox regardless
   * of this flag: the capabilities a phone receives are the desk machine's.
   */
  openInEditor?: boolean;
  /**
   * Whether generated-video hover actions may reveal the file in the host's
   * file manager. OPT-IN: absent/false keeps the existing open-file action.
   */
  showInFolder?: boolean;
  /**
   * Open View-all text and proposed diffs in the shared in-app preview
   * overlay instead of a host editor or bare window. OPT-IN: absent/false
   * keeps the current path (VS Code tabs, older desktop windows, remote
   * inline expand). Desktop advertises this; remotes never receive it.
   */
  previewInApp?: boolean;
  /**
   * Gear → Settings opens a VS Code editor-area tab instead of the
   * in-page overlay. OPT-IN: absent/false = overlay (desktop, remote, older
   * hosts). Remotes never receive it — a phone cannot open a desk editor tab.
   */
  settingsEditor?: boolean;
  /**
   * The rail's "add project folder" control. OPT-IN, unlike the two above:
   * absent/false = hide. A host that never sent it cannot open a folder picker,
   * and VS Code deliberately does not — its workspace is VS Code's to manage.
   */
  addProjectFolder?: boolean;
  /** May this surface take a project back OUT of the list?
   *  Separate from addProjectFolder on purpose: that one answers "is the
   *  native picker here", which is false on every remote, and Hide rode on it
   *  until create/clone made it true on remotes and produced a control that
   *  rendered, posted, and was dropped in silence. */
  removeProjectFolder?: boolean;
  /**
   * Add project can also MAKE one: a typed name becomes a folder in the host's
   * project root. OPT-IN — absent/false means the menu offers only the folder
   * picker, which is what every host before this shipped.
   */
  createProject?: boolean;
  /**
   * …and clone one: a repository URL becomes a checkout in the same root.
   * Independent of {@link createProject} so a host can offer one without the
   * other. OPT-IN; absent/false hides the entry entirely.
   */
  cloneProject?: boolean;
  /**
   * `queueSend` / `queuedSends` carry per-item attachments. OPT-IN: absent/false
   * = the webview posts text-only `queueSend` (and refuses to queue when the
   * composer holds a chip — everything or nothing). Older hosts omit the field
   * and would ignore extra `chips` / `queued` keys.
   */
  queueSendChips?: boolean;
};

/** One host-owned queued follow-up. `chips` omitted means none. */
export type QueuedSend = {
  text: string;
  chips?: FileChip[];
};
