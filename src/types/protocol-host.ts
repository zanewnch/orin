import type {
  ModelInfo, PromptResultMeta, PromptUsage, PermissionRequest, ExitPlanRequest, QuestionRequest,
} from "../acp/acp";
import type { FileChip } from "../composer/chips";
import type { RepoListEntry, SessionListEntry } from "../session/sessions";
import type { Dot } from "../session/session-pool";
import type { RunProgressUpdate } from "../session/run-progress";
import type { McpServerView } from "../mcp/mcp";
import type { ConnectorView } from "../mcp/mcp-connectors";
import type { RoutineModelOption, RoutineProjectOption, RoutineView } from "../routines";
import type {
  GithubRepoView,
  GithubState,
  HostErrorCode,
  HostUiCapabilities,
  PlanHistoryItem,
  ProjectSetupGithub,
  QueuedSend,
  ToolCallPayload,
} from "./protocol-shapes";

export type HostMsg =
  | { type: "initialState"; effort: string; cwd: string; useCtrlEnter: boolean; extVersion: string; showThinking: boolean; expandCommandOutputs: boolean; steerByDefault: boolean; soundNotifications: boolean; processingSound: boolean; readRepliesAloud: boolean; /** Global "Use this app for" — absent on older hosts means Knowledge work. */ appPurpose?: "knowledge" | "coding";
      /** VS Code language id for command View all, from the host shell dialect.
       *  Absent on older hosts — View all then omits language. */
      commandLanguage?: string;
      /** Which GUI is on the other end. A phone is looking at neither the
       *  extension nor the desktop app, so it cannot infer this, and its
       *  About page has to name what it is connected to. Optional and
       *  additive: absent means an older host, and the page keeps the local
       *  panel rather than inventing an answer. */
      hostKind?: "extension" | "desktop";
      /** The desk machine's display name — the same string the device list
       *  shows, so "Connected to" names something the user recognises. */
      hostName?: string;
      /** Product telemetry opt-out. Absent on older hosts; remotes treat that
       *  as unknown and show the explanation without an on/off claim. */
      telemetryEnabled?: boolean;
      /**
       * Settings → General "Thumbs feedback to SpaceXAI" (`grok.thumbsFeedback`).
       * Default off. Absent on older hosts — the webview must not invent thumbs
       * from this field; `feedbackAvailability` remains the affordance gate.
       */
      thumbsFeedback?: boolean;
      capabilities: HostUiCapabilities }
  /** Live retraction of `capabilities.moveViewHint`, sent the moment the user
   *  opens the host's move-view picker. `initialState` is not re-sent on a
   *  session swap, so without this the webview keeps a stale true and rebuilds
   *  the hint the user has already acted on. */
  | { type: "moveViewHint"; value: boolean }
  /**
   * Facts the empty-state tip pool needs and the client cannot observe itself,
   * plus the tips the user is done with.
   *
   * Everything else the pool reads — connected agents, app purpose, read-aloud,
   * voice, whether this machine is linked — already reaches the chat client on
   * its own. Routines and connectors do NOT: only the settings surface asks for
   * those, so a chat client that has never opened Settings would otherwise
   * advertise routines to someone running twenty of them. Counts, never
   * contents: the tip only needs to know whether the number is zero.
   *
   * Additive. An older host sends no frame at all, and the client suppresses
   * the two count-dependent tips rather than reading an absent count as zero.
   */
  | {
      type: "welcomeTips";
      routineCount: number;
      connectorCount: number;
      dismissed: string[];
      /**
       * Tips that have already had their turn today, in the HOST's timezone.
       * Additive: an older host omits it and the pool behaves as it did before
       * the once-a-day rule existed.
       */
      shownToday?: string[];
    }
  /**
   * State of the Add project form: where new projects go, and how the last
   * attempt went.
   *
   * One frame for both ways in (a typed name, a cloned URL) because they are
   * the same form with a different field, and splitting them would be two
   * registries to keep in step for no gain.
   *
   * `root` is the DISPLAY form (`~/Grok Build`), never a home path — the client
   * only needs it to show where the folder will land, and a remote has no
   * business learning the desk's home directory. Nothing here carries the
   * created path either: the repo catalog delivers that, already filtered to
   * what the receiving client may reach.
   */
  | {
      type: "projectSetup";
      root: string;
      /** In flight — the form disables and says what it is doing. */
      busy?: "new" | "clone";
      /** Why the last attempt failed. Absent means nothing has gone wrong. */
      error?: string;
      /**
       * A next step we can take FOR them rather than describe. Only ever set
       * for github.com, because `gh auth login` cannot help a GitLab failure.
       */
      fix?: "install-gh" | "auth-gh";
      /** The command `install-gh` would run, so the copy can name it. */
      fixCommand?: string;
      /** A project was actually made — the form closes on this, not on silence. */
      done?: boolean;
      /**
       * Headless GitHub CLI sign-in, shown only inside the clone form.
       * Additive: an older client ignores it and renders the form as before.
       */
      github?: ProjectSetupGithub;
      /**
       * The derived folder name was already taken. Additive: the form then
       * asks for a different name rather than failing the clone as a dead end.
       */
      collision?: string;
    }
  /**
   * GitHub connection for Settings and the clone picker. Additive: an older
   * client ignores it. Never carries a token.
   */
  | { type: "githubState"; github: GithubState }
  /**
   * One page of repositories for the clone combobox. Fetched on form open,
   * filtered on the client — a keystroke must not cross the relay.
   */
  | { type: "githubRepos"; repos: GithubRepoView[]; truncated?: boolean; error?: string }
  /** Connected agents plus host-observed, view-only version facts. Version
   * fields are additive so an older host/client keeps the connection UI.
   * `needsLogin` is the account that is still configured but answered an
   * auth-shaped failure: every affordance that would otherwise imply it works
   * (a selectable model row, a silently empty history) becomes the same sign-in
   * action the connect flow uses.
   * `checking` is a re-observation in flight (Settings → Providers Refresh). It
   * is the ONLY source of that spinner: a client must never latch it locally,
   * or an older host that ignores `refreshProviders` would spin forever. */
  | { type: "providerState"; providers: { id: "grok" | "codex" | "claude"; connected: boolean; needsLogin?: boolean; cliVersion?: string; adapterVersion?: string; latestCliVersion?: string; updateAvailable?: boolean }[]; checking?: boolean }
  /** Grok's grok.com + user-level MCP inventory (`_x.ai/mcp/list`; project-file
   *  servers omitted). The desk keeps launch recipes and `configFile`; remotes
   *  receive `projectMcpServerForRemote` (page fields only — no `tag`).
   *  Connect/disconnect stay desk-only. */
  | { type: "mcpServers"; servers: McpServerView[]; loading?: boolean; error?: string; warning: string }
  /** Host-owned Tier-1 connector catalog. Mirrored so a remote can SEE which
   *  apps are connected; connect/disconnect stay desk-only (OAuth + ~/.mcp-auth
   *  and key-auth HostSecrets live on the machine running the host). Views
   *  never carry the key. */
  | { type: "mcpConnectors"; connectors: ConnectorView[] }
  /**
   * The Routines page, whole. Carries its own pickers rather than leaning on
   * the chat state, because the VS Code settings TAB loads settings.js and
   * nothing else — and because `projects` is then filtered by the same
   * authorization pass that filters `entries`, so a remote cannot be offered a
   * project it may not reach.
   *
   * `error` is the last save/delete refusal, cleared by the next successful
   * write. Folded in here rather than given its own type, matching `mcpServers`.
   */
  | {
      type: "routines";
      entries: RoutineView[];
      projects: RoutineProjectOption[];
      models: RoutineModelOption[];
      error?: string;
      errorId?: string;
    }
  | { type: "codexInstallProgress"; phase: "downloading" | "verifying" | "installing" | "idle"; receivedBytes?: number; totalBytes?: number; reason?: string }
  /** Plan picker gate. `recheckable` means the version probe failed (not a
   *  verified-old CLI) — the row stays clickable so a later pick re-probes. */
  | { type: "planModeAvailability"; available: boolean; reason?: string; recheckable?: boolean }
  | { type: "showThinking"; value: boolean }
  /** Live update of the global app-purpose preference (Knowledge work / Coding). */
  | { type: "appPurpose"; value: "knowledge" | "coding" }
  // grok.soundNotifications — live toggle for the turn-complete/error sound (#59).
  | { type: "soundNotifications"; value: boolean }
  | { type: "processingSound"; value: boolean }
  // grok.readRepliesAloud — local VS Code speech-synthesis preference.
  | { type: "readRepliesAloud"; value: boolean }
  | { type: "summarizeRepliesAloud"; value: boolean }
  | { type: "speechSummary"; requestId: number; text: string }
  | { type: "moveComposerCaret"; direction: "forward" | "previousLine" }
  // Whether this machine holds a relay device token (gear "AFK Pilot" section).
  // Local-webview chrome — never mirrored to remotes.
  | { type: "remoteStatus"; linked: boolean }
  | { type: "fontScale"; value: number }
  | { type: "grokUpdateStatus"; current?: string | null; latest?: string | null; updateAvailable?: boolean; policy?: unknown; error?: string }
  /** Desktop app update notice (manual download page). Host-local; VS Code
   *  never sends this. Capability = frame arrived; no host flag. Fallback when
   *  the in-app updater cannot check or download. */
  | { type: "updateAvailable"; version: string; url: string }
  /** Desktop in-app update is downloaded and waiting for restart. Host-local. */
  | { type: "updateReady"; version: string }
  | { type: "initialized"; info: { cliPath: string; cwd: string; version: string | null; provider?: "grok" | "codex" | "claude"; init: { protocolVersion?: unknown } } }
  | { type: "cliUpdating" }
  // `worktree` gates the gear's Apply/Remove worktree items to worktree sessions.
  | { type: "session"; sessionId: string; models: ModelInfo[]; currentModelId: string | undefined; worktree?: boolean; provider?: "grok" | "codex" | "claude" }
  // The focused conversation's display name, using the same precedence as a
  // history row. It is separate from `sessions` because VS Code does not keep
  // that browser-only list populated while the history popover is closed.
  // `repoCwd` is the PROJECT this conversation belongs to, which is not always
  // its `cwd`: a worktree session runs in an isolated checkout that is
  // deliberately not a catalog row, so a client resolving the label from `cwd`
  // alone falls back to that directory's leaf — and if the leaf happens to match
  // another project's name, it presents one project's conversation as another's.
  // Optional and additive: a client that never sees it keeps its old fallback.
  | { type: "sessionName"; sessionId: string; name: string; cwd: string; repoCwd?: string }
  | { type: "modelChanged"; modelId: string }
  | { type: "modeChanged"; modeId: string }
  | { type: "openModePopover" }
  | { type: "voiceState"; status: "listening" | "transcribing" | "idle" }
  | { type: "voiceConfigured"; value: boolean; sendPhrase?: string; keyterms?: string[] }
  /** Live `grok.telemetry.enabled` so the settings surface stays in sync. */
  | { type: "telemetryEnabled"; value: boolean }
  /** Live `grok.thumbsFeedback` so the settings surface stays in sync. */
  | { type: "thumbsFeedback"; value: boolean }
  | { type: "voicePartial"; text: string }
  | { type: "voiceSubmit"; text: string }
  | { type: "voiceTranscript"; text: string; send?: boolean }
  | { type: "voiceError" }
  | { type: "chips"; chips: FileChip[] }
  | { type: "commandsUpdate"; commands: unknown[] }
  // Reply to the webview's `mentionQuery` (the composer's `@` file popover):
  // workspace-relative paths (forward slashes), ranked by src/composer/mention.ts. The
  // echoed `query` lets the webview drop stale replies after further typing.
  | { type: "mentionResults"; query: string; files: string[] }
  /**
   * Answer to `listProjectDir` (remote file browse). `cwd` echoes the scoped
   * root; `relPath` is the listed directory ("" = repo root). No absolute host
   * paths — only workspace-relative entry paths.
   */
  | {
      type: "projectDirListing";
      requestId?: string;
      cwd: string;
      relPath: string;
      ok: true;
      entries: Array<{ name: string; kind: "file" | "dir"; relPath: string }>;
      truncated: boolean;
    }
  | { type: "projectDirListing"; requestId?: string; cwd: string; relPath: string; ok: false; reason: string }
  /**
   * Answer to `readProjectFile`. Preview kinds match desktop `classifyFilePreview`
   * (markdown/json/image/text); binary / external / oversize fail with `ok:false`.
   * Caps: {@link FILE_PREVIEW_MAX_BYTES} / {@link FILE_PREVIEW_MAX_IMAGE_BYTES}
   * in `src/composer/file-tree.ts`.
   *
   * When the host advertises `editProjectFiles`, text kinds also carry `stamp`
   * + `absPath` so a later save can prove identity (same file) and version
   * (mtime+size). Image previews never include those fields.
   */
  | {
      type: "projectFileContent";
      requestId?: string;
      cwd: string;
      relPath: string;
      ok: true;
      kind: "markdown" | "json" | "image" | "text";
      text?: string;
      dataUrl?: string;
      pretty?: boolean;
      /** The JSON pretty-printer actually CHANGED the text, so line numbers
       *  here do not describe the file on disk. `pretty` only says it ran. */
      reformatted?: boolean;
      /** Present for editable text when host advertises edit — mtime+size. */
      stamp?: { mtimeMs: number; size: number };
      /**
       * Absolute path this content was read at. Sent only with edit capability
       * so the save can refuse a cross-project relPath collision (see
       * `writeTreeFile` expectedAbsPath). Round-trip only — never displayed.
       */
      absPath?: string;
    }
  | { type: "projectFileContent"; requestId?: string; cwd: string; relPath: string; ok: false; reason: string }
  /**
   * Answer to `writeProjectFile`. Success returns the new stamp so the client
   * can keep editing without re-reading. Failure reasons mirror `writeTreeFile`
   * (`changed`, `workspace changed`, containment, etc.).
   */
  | {
      type: "projectFileWriteResult";
      requestId?: string;
      cwd: string;
      relPath: string;
      ok: true;
      stamp: { mtimeMs: number; size: number };
    }
  | {
      type: "projectFileWriteResult";
      requestId?: string;
      cwd: string;
      relPath: string;
      ok: false;
      reason: string;
    }
  /** `steer` marks a mid-turn interjection (#52). It paints a user bubble but is
   *  NOT a prompt and gets no rewind point, so the bubble must not consume a
   *  rewind index — see refreshUserRewindButtons. */
  | { type: "userMessage"; text: string; chips?: FileChip[]; steer?: boolean; submissionId?: string }
  | { type: "agentStart" }
  | { type: "thoughtChunk"; text: string }
  | { type: "messageChunk"; text: string }
  | { type: "media"; media: string; src?: string; url?: string; mimeType?: string; path?: string }
  | {
      type: "userMessageChunk";
      text: string;
      timestampMs?: number;
      images?: Array<{ imageIndex: number; path?: string; previewSrc?: string; fullId?: string }>;
    }
  /** Answer to {@link WebviewMsg} `requestImageFull`. Sent only to the tab that
   *  asked; `src` absent means the source is gone (swept, or deleted). */
  | { type: "imageFull"; fullId: string; src?: string }
  | { type: "historyReplay"; active: boolean }
  /** Remote reconnect snapshot delivered as one browser event. Updated clients
   *  render every nested message synchronously; older per-message frames remain
   *  valid and continue through their existing handlers. */
  | { type: "historyBatch"; messages: HostMsg[] }
  | { type: "permissionHistoryQueue"; permissions: unknown[] }
  | { type: "planHistoryQueue"; plans: PlanHistoryItem[] }
  | { type: "toolCall"; call: ToolCallPayload }
  | { type: "toolCallUpdate"; call: ToolCallPayload }
  | { type: "permissionRequest"; req: PermissionRequest }
  | { type: "permissionOptions"; requestId: number | string; options: PermissionRequest["options"] }
  | { type: "permissionResolved"; requestId: number | string; optionId: string }
  // The host spreads the plan-review snapshot (planPath/planName) into the bare
  // ExitPlanRequest before posting, so the wire shape is wider than acp's type.
  | { type: "exitPlanRequest"; req: ExitPlanRequest & { planPath?: string; planName?: string } }
  | { type: "planResolved"; requestId: number | string; verdict: "approved" | "abandoned" | "rejected" }
  | { type: "questionRequest"; req: QuestionRequest }
  | { type: "planNotice"; text: string }
  | { type: "autoCompactNotice"; text: string }
  | { type: "planBlocked"; kind: string; target: string }
  | { type: "promptComplete"; meta: PromptResultMeta }
  // Context occupancy for the donut. `used` is optional so an adapter can
  // deliver `usage_update.size` (the real window) before any occupancy exists.
  // The structured fields are only populated by Grok's `_x.ai/session/info`.
  | {
      type: "contextUsage";
      used?: number;
      window?: number;
      categories?: { label: string; tokens: number; detail?: string }[];
      systemPromptTokens?: number;
      toolDefinitionsTokens?: number;
      toolDefinitionsCount?: number;
      messageTokens?: number;
      freeTokens?: number;
      autoCompactThresholdPercent?: number;
    }
  | { type: "agentReset" }
  | { type: "agentError"; text: string }
  | { type: "agentEnd"; meta?: PromptResultMeta }
  | { type: "exit"; code: number | null }
  | { type: "setBusy"; value: boolean; locked?: boolean }
  | { type: "summarizing" }
  | { type: "sessionContext" }
  | { type: "clearMessages" }
  // "provider-connected" is the one SUCCESS state here: a re-check that worked
  // used to leave a bare empty session, indistinguishable from nothing having
  // happened. It clears itself when the first message paints.
  // "no-project" is the desktop empty-open-set state: chat cannot start until
  // the user adds a folder. It replaces the baked "Starting" spinner that
  // otherwise never clears (startSession used to return without unlocking).
  // `launched` says the HOST already opened the login terminal, so the panel can
  // show it as done. Without it an automatically opened terminal leaves the
  // button looking untouched, which reads as "press it again".
  // `device` is the headless sign-in, and it is additive on purpose: a remote
  // gets the same `onboarding` panel it always got, plus a URL and a code when
  // the host is running a device-code flow for it. A client that predates the
  // field ignores it and shows the panel exactly as before, which is the right
  // fallback — it still says which agent needs connecting.
  //
  // Only the REMOTE path ever carries it. At a desk the CLI opens the browser
  // itself and a terminal is the better affordance, so nothing changes there.
  | {
      type: "onboarding";
      state: "connect-agent" | "missing-cli" | "auth-required" | "missing-codex" | "codex-login" | "missing-claude" | "claude-login" | "provider-connected" | "no-project";
      platform?: string;
      reason?: string;
      provider?: "grok" | "codex" | "claude";
      launched?: boolean;
      device?: {
        /** starting: spawned, nothing printed yet. waiting: URL and code are on
         *  screen and the CLI is polling (or, with needsCode, waiting for a
         *  paste). done/failed: terminal. unavailable: this provider has no
         *  flow that works without a terminal. */
        status: "starting" | "waiting" | "verifying" | "done" | "failed" | "unavailable";
        url?: string;
        code?: string;
        /** Paste-code flow: the person must type a code into the card. Set from
         *  the plan, not inferred from a missing printed code. Additive. */
        needsCode?: boolean;
        /** The paste was written to the CLI; the card can stop offering input. */
        submitted?: boolean;
        /** Said to the person, not logged — a failure or an explanation. */
        message?: string;
        /**
         * Shown BEFORE the sign-in starts, when it is likely to fail for a
         * reason the person can fix in seconds. Codex device-code login is off
         * by default on every account; telling somebody that after a wait and a
         * failure is telling them too late.
         *
         * Cloud environments only — at a desk the browser flow works and this
         * setting never comes up.
         */
        preflight?: { title?: string; reason: string; steps: string[]; url?: string; continueLabel?: string };
        /** Said BESIDE the code: the vendor page carries a phishing warning and
         *  the reader needs to know it is expected before they meet it. */
        note?: string;
      };
    }
  // resumeFailed is additive: a remote resume refusal names the requested id so
  // the browser outbox can fail closed. Older clients ignore the extra field.
  // code is additive too — a harness must not match user-facing `text`.
  // "interrupted-send" is a send abandoned after its userMessage echo.
  // "session-superseded" is a tab that lost (or failed to restore) a
  // conversation another tab now holds — see resumeSession.claim.
  | { type: "error"; text: string; resumeFailed?: { id: string }; code?: HostErrorCode }
  | { type: "hostNotice"; level: "info" | "warning"; text: string }
  | { type: "xaiNotification"; update?: unknown }
  // Persisted xAI lifecycle (method _x.ai/session/update): subagent spawn/finish
  // plus replayed turn_completed, whose timestamp finalizes the agent footer.
  | { type: "subagentUpdate"; update?: unknown; timestampMs?: number }
  /**
   * Live child-session stream demuxed off the parent ACP stdout (#62).
   * Additive: an older webview that ignores this type loses nothing it has today.
   * Child transcripts are not replayed on cold session/load.
   */
  | { type: "childStream"; childSessionId: string; event: "messageChunk"; text: string }
  | { type: "childStream"; childSessionId: string; event: "thoughtChunk"; text: string }
  | { type: "childStream"; childSessionId: string; event: "userMessageChunk"; text: string }
  | { type: "childStream"; childSessionId: string; event: "toolCall"; call: ToolCallPayload }
  | { type: "childStream"; childSessionId: string; event: "toolCallUpdate"; call: ToolCallPayload }
  // Deep Research / Workflow / Goal progress (P2-10) — normalized from the
  // live `_x.ai/session_notification` rail (`workflow_updated` / `goal_updated`).
  // Cards update in place by `id`; terminal phases stop the live dots.
  | { type: "runProgress"; update: RunProgressUpdate }
  // A finished shell command's full text + captured output (#41). Live grok
  // snapshots at terminal/release; session/load hydrates the same message from
  // the replayed tool_call (`commandOutputForToolCall`). This host always
  // states `cancelled` (true = live `commandDone` with no exit; false = not a
  // kill, including hydrated / Claude "exit not reported"). The field stays
  // optional on the wire because older hosts omit it; the client treats
  // absence as that older rule (`exitCode == null` → [Cancelled]), which was
  // correct then — those hosts never emitted replay-hydrated commandOutput.
  // `toolCallId` is always stated on MCP commandOutput (the ACP id the
  // webview joins IN to OUT by). Shell output omits it — absence means join
  // by `command` (this host's shell path, or an older host).
  // `agentSawCut` is always stated by this host. `true` is a cut the agent
  // already saw (terminal byte cap / CLI `truncated` on a replayed execute).
  // `false` is this host's 100K display cap on an MCP result the provider
  // returned in full. Older hosts omit the field; the client must not
  // attribute that cut either way (do not claim the agent saw it, and do
  // not claim this is display-only).
  | { type: "commandOutput"; command: string; output: string; exitCode: number | null; truncated: boolean; cancelled?: boolean; toolCallId?: string; agentSawCut?: boolean }
  // grok.expandCommandOutputs — pre-expand every command's IN/OUT detail.
  | { type: "expandCommandOutputs"; value: boolean }
  // grok.steerByDefault — send-while-busy skips the queue and steers (#52).
  | { type: "steerByDefault"; value: boolean }
  // On-demand audit: expand (open:true) / collapse (open:false) EVERY tool group
  // and command IN/OUT box in the focused session at once. Ephemeral (not
  // persisted) — the Command Palette "Grok: Expand/Collapse All Tool Details".
  | { type: "setAllToolDetails"; open: boolean }
  // Move keyboard focus into the composer input (#43) — posted after Send
  // Selection / Send File / @-mention so the user can type a prompt right away.
  // Ephemeral UI action, not session-scoped (goes via `post`, never buffered).
  | { type: "focusInput" }
  /** Open the in-webview find bar (#99). Command Palette + Ctrl/Cmd+F fallback
   *  when the workbench swallows the keystroke inside a WebviewView. Ephemeral
   *  (`post`, never buffered). Host-local — remotes open find from their own ⋯. */
  | { type: "findInSession" }
  /** Put text back in the composer (Edit-and-resend, #56). Posted after the
   *  rewind + reload so it survives the clearMessages/replay that follows. */
  | { type: "restoreComposer"; text: string }
  /** Drop everything after the Nth visible user message (rewind/edit, P2-9).
   *  Replaces the old clearMessages + full reload, which blanked the panel to
   *  the welcome logo and re-rendered the whole conversation. */
  | { type: "truncateMessages"; surviving: number }
  /** Ask the webview to run its own in-chat confirm dialog and report back.
   *  Used where only the HOST knows whether a confirm is warranted (rewind/edit
   *  reverting files), so the webview can't decide to show `uiConfirm` itself.
   *  `id` correlates the answer; the host awaits a promise keyed on it. */
  | { type: "uiConfirmRequest"; id: string; title: string; body?: string; confirmLabel: string; danger?: boolean }
  // nextOffset = the index offset the next load-more should request — ids CONSUMED
  // from the on-disk index, not entries shown (hidden subagent sessions occupy
  // slots without producing rows).
  | { type: "sessions"; entries: SessionListEntry[]; activeId?: string | null; dots: Record<string, Dot>; offset: number; total: number; hasMore: boolean; nextOffset: number; providerCursor?: { grokOffset: number; codexHighWater?: { updatedAt: number; id: string } }; query: string }
  // A preview page for ONE repo, answering `listRepoSessions`. Deliberately a
  // separate frame from `sessions`: that one is the focused history list and
  // owns paging/search/auto-open state, so a sibling repo's rows arriving on it
  // would clobber the list the user is actually reading. `cwd` echoes the scope
  // the host resolved, which is also the capability signal — a client that
  // never sees this frame keeps its single-repo fallback.
  | {
      type: "repoSessions";
      cwd: string;
      entries: SessionListEntry[];
      dots: Record<string, Dot>;
      total: number;
      /** Additive refusal detail. Older clients ignore it and render the empty page. */
      error?: "project-unavailable" | "sessions-unavailable";
    }
  // Every pinned conversation, across ALL repos — the projects rail's Pinned
  // group. Deliberately not per-repo: a pin is only worth anything if it lifts a
  // conversation OUT of the project you would otherwise have to open first, so
  // no repo-scoped frame can answer it. Entries carry their own `cwd`, which is
  // what lets a row name its repo and reopen in the right checkout.
  | { type: "pinnedSessions"; entries: SessionListEntry[]; dots: Record<string, Dot> }
  // `canAddProject` is how the VS Code projects rail learns it may offer "Add
  // project": that view is resolved on its own and gets no `initialState`, so it
  // has no `capabilities` to read. Optional and additive — a client that never
  // sees the field paints no control, which is the safe way round.
  | {
      type: "repos";
      entries: RepoListEntry[];
      selectedCwd: string;
      activeCwd: string;
      canAddProject?: boolean;
      /**
       * The other two ways in, on the same channel and for the same reason.
       * Optional and additive: a rail that never sees them offers the picker
       * alone, which is what it did before there was anything else.
       */
      canCreateProject?: boolean;
      canCloneProject?: boolean;
      /**
       * The folder the EDITOR has open, which since history started following
       * the rail is no longer the same thing as `selectedCwd`. The VS Code rail
       * marks this one "Your IDE" and pins it to the top: you can be working in
       * another project while the window stays where it was, and the rail has to
       * be able to say which is which. Optional and additive — a client that
       * never sees it falls back to the selection, as it did before.
       */
      workspaceCwd?: string;
    }
  | { type: "sessionDot"; id: string; dot: Dot }
  // Full snapshot of the focused session's host-owned send queue (#37) — the
  // webview renders pending user blocks from this; replay rebuilds them.
  // `items` stays string[] so an older webview still renders text. `queued` is
  // additive: same contributions plus per-item chips. A client that never sees
  // it keeps today's text-only block.
  | { type: "queuedSends"; items: string[]; queued?: QueuedSend[] }
  // A remote queued prompt is ready to run. The browser echoes this as an
  // ordinary send carrying the same host-issued id, so relay quota/rate metering
  // applies at dequeue time and replayed/outbox copies are recognisably one send.
  | { type: "submitQueuedSend"; id: string; text: string }
  // Steer (#52) is unavailable on this CLI (`_x.ai/interject` → -32601). Latches
  // the button off for the session; the queue stays as the fallback.
  | { type: "steerUnavailable" }
  /**
   * Grok-only thumbs (#114). Off until the host has a positive signal
   * (`session/new` `_meta.feedbackEnabled` or an advertised `feedback` command)
   * and not latched off by `-32601` / "Feedback is disabled." Older hosts omit
   * the frame — the webview must not invent buttons.
   */
  | { type: "feedbackAvailability"; available: boolean }
  /**
   * Host-confirmed rating for the live-process turn that just finished.
   * `0` clears. Also restores the thumbs affordance after a focus-swap
   * (the only turn that can be rated). Nothing is read back from the agent.
   */
  | { type: "turnFeedbackAck"; rating: -1 | 0 | 1 }
  // Session-cumulative billing (#53), summed by the host across the session's
  // turns. `turn` is the last prompt's own usage. Both omitted when the CLI sent
  // no `_meta.usage` — the popover then shows only the context row, never zeros.
  | { type: "usage"; turn?: PromptUsage; session?: PromptUsage; afterUserMessage?: number; afterHistoryEvent?: number };
