import type { FileChip } from "../composer/chips";
import type { RoutineDraft } from "../routines";

/** webview -> host */
export type WebviewMsg =
  | { type: "ready"; tabToken?: string }
  // Browser-owned remote preferences reported for session_start telemetry.
  | { type: "remotePreferences"; fontScale: number; readRepliesAloud: boolean; summarizeRepliesAloud?: boolean; usesTouch: boolean }
  | { type: "send"; text: string; chips?: FileChip[]; bare?: boolean; queuedSendId?: string; submissionId?: string }
  // `cwd` names the project to start in, for a client that can SEE which project
  // it is asking for — the VS Code rail's per-project "+". Optional and additive:
  // omitted, the host starts in its own scope exactly as before. The host
  // resolves it through the catalog and ignores anything unknown, and a remote's
  // value is discarded outright (`newRemoteSession` starts in that tab's repo).
  | { type: "newSession"; cwd?: string }
  | { type: "cancel" }
  | { type: "pickModel" }
  | { type: "setMode"; modeId: "agent" | "plan" | "yolo" }
  | { type: "removeChip"; id: string }
  | { type: "toggleChip"; id: string }
  | { type: "openFile"; path: string }
  | { type: "showInFolder"; path: string }
  | { type: "openUrl"; url: string }
  // `language` is optional. Command View all may send the host shell language
  // (`initialState.commandLanguage`: powershell / shellscript / bat). Output
  // omits it so the untitled editor can detect file-shaped content. An absent
  // field must not be rewritten to plaintext.
  //
  // `filename` is an additive save-as hint (basename or a host-joined default
  // path). Absent: untitled / viewer, as before. Present: each host chooses
  // delivery — VS Code still opens an untitled tab; desktop opens the OS save
  // dialog (session Markdown export and the preview overlay's Save As). An
  // older host ignores the field and keeps the untitled/viewer path.
  | { type: "openText"; content: string; language?: string; filename?: string }
  | {
      type: "openDiff";
      path: string;
      oldText: string;
      newText: string;
      requestId?: number | string;
      replaceAll?: boolean;
      sites?: { oldText: string; newText: string; oldLine?: number; newLine?: number }[];
    }
  | { type: "exportExpr"; action: string; kind: string; current?: string; svg?: string; png?: string; svgDark?: string; svgLight?: string }
  | { type: "setEffort"; level: string }
  | { type: "addProjectFolder" }
  /** Close one project folder. It leaves the rail; nothing leaves the disk. */
  | { type: "removeProjectFolder"; cwd?: string }
  | { type: "openGlobalConfig" }
  | { type: "openProjectConfig" }
  | { type: "listMcpServers" }
  /** Open the Routines page — the host answers with a `routines` frame. */
  | { type: "listRoutines" }
  /** Create when `id` is absent, replace when it is present. The host
   *  validates: a draft that cannot run is refused rather than stored. */
  | { type: "saveRoutine"; id?: string; draft: RoutineDraft }
  | { type: "deleteRoutine"; id: string }
  | { type: "setRoutinePaused"; id: string; paused: boolean }
  /** Fire once, now. Deliberately takes no window key — a manual run must not
   *  consume the scheduled one. */
  | { type: "runRoutineNow"; id: string }
  /** Desk-only: OAuth opens a browser; key-auth sends `key` once (never echoed). */
  | { type: "connectMcpConnector"; id: string; key?: string; readOnly?: boolean }
  /** Desk-only: drop the id from our list. Key-auth also deletes the HostSecrets entry. OAuth does not delete ~/.mcp-auth tokens. */
  | { type: "disconnectMcpConnector"; id: string }
  | { type: "showLogs" }
  /** Unpackaged desktop only — toggle Chromium DevTools (gear / F12). */
  | { type: "toggleDevTools" }
  /** Open the host settings UI (VS Code: workbench settings focused on grok). */
  | { type: "openSettings"; section?: string }
  /** Open the shared Grok settings surface as a VS Code editor tab. */
  | { type: "openSettingsSurface"; category?: string }
  /** Close the Grok settings editor tab (Escape / Close on that page). */
  | { type: "closeSettingsSurface" }
  /**
   * Retire one empty-state tip, for good, on this machine.
   *
   * Sent when the reader either acts on a tip or dismisses it — both mean the
   * same thing, which is why there is one message and not two. Most tips retire
   * on their own when the thing they advertise gets set up; this covers the ones
   * that never would (Plan mode, `@` mentions) and the reader who has decided
   * twice that they are not interested.
   */
  | { type: "dismissWelcomeTip"; id: string }
  /**
   * One tip appeared. Recorded against the local day so it does not come round
   * again before tomorrow — the pool is small, and a line seen three times in
   * an afternoon has stopped being advice.
   *
   * Sent at most once per tip per day by the client, which keeps its own copy
   * of the list; the host writes only when the day actually changes.
   */
  | { type: "welcomeTipShown"; id: string }
  /**
   * Make a project folder called `name` inside the host's one project root.
   *
   * A NAME, never a path — which is the entire reason this can be reachable
   * from a phone when `addProjectFolder` never could. The client says what to
   * call it; the host decides where it goes and refuses anything that resolves
   * outside the root. See src/projects/project-create.ts.
   */
  | { type: "createProject"; name: string }
  /**
   * Clone `url` into the same root, under the folder name the URL implies.
   *
   * Same containment: a URL is not a destination. Git's own credential helper
   * does the authenticating — nothing here mints, stores or forwards a token.
   */
  | { type: "cloneProject"; url: string; name?: string }
  /**
   * Install or sign in to the GitHub CLI.
   *
   * Offered after a clone failed in a way `gh` would fix, and from the
   * Settings GitHub row / the clone picker's connect row. A local webview
   * still opens a terminal. A remote `auth` runs the headless device-code flow
   * and reports the URL and code on `projectSetup.github` and `githubState`.
   */
  | { type: "setupGithubCli"; action: "install" | "auth"; surface?: "settings" }
  /**
   * List this account's repositories for the clone combobox. Host runs
   * `gh repo list --limit 200` once; the client filters. A remote may send
   * this: the picker is how a phone clones, and it reveals nothing a clone
   * of those URLs would not already reach.
   */
  | { type: "listGithubRepos" }
  /**
   * Sign out of GitHub on this machine. Same class as agent `logout`: desk
   * remotes must not revoke a credential every surface shares; a cloud
   * machine has no other surface, so CLOUD_DISPOSITION admits it there.
   */
  | { type: "githubSignOut" }
  /**
   * Store a pasted GitHub token via `gh auth login --with-token`. The token
   * is a secret: the host must never echo it, log it, or put it in state the
   * webview can read. A remote may send this — a cloud machine is exactly
   * where a fine-grained token is the narrower credential to be holding.
   */
  | { type: "githubLoginWithToken"; token: string }
  // `panel-right` / `panel-bottom` dock the panel on that edge before revealing;
  // plain `panel` leaves the layout alone (view-move.ts § panelPositionFor).
  //
  // `pick` maps to no container on purpose, so the host falls through to its own
  // destination picker. That picker targets a LOCATION rather than a container,
  // which is the only way into a dock a host renders for itself — in Cursor it
  // is the difference between reaching the secondary side bar and not.
  | { type: "moveView"; location: "panel" | "panel-right" | "panel-bottom" | "sidebar" | "auxiliarybar" | "pick" }
  | { type: "setShowThinking"; value: boolean }
  /** Persist the global "Use this app for" preference (Knowledge work / Coding). */
  | { type: "setAppPurpose"; value: "knowledge" | "coding" }
  // grok.soundNotifications gear switch (#59) — persisted globally by the host.
  | { type: "setSoundNotifications"; value: boolean }
  | { type: "setProcessingSound"; value: boolean }
  | { type: "setReadRepliesAloud"; value: boolean }
  | { type: "setSummarizeRepliesAloud"; value: boolean }
  | { type: "summarizeSpeech"; requestId: number; text: string }
  /** Ask the host to render a full-size version of an image it already sent a
   *  thumbnail for. `fullId` is an opaque handle the HOST issued — deliberately
   *  not a path, so a remote can only ask for pictures it was already shown. */
  | { type: "requestImageFull"; fullId: string }
  | { type: "composerFocus"; focused: boolean }
  | { type: "setExpandCommandOutputs"; value: boolean }
  | { type: "setSteerByDefault"; value: boolean }
  /** Persist `grok.voiceSendPhrase`. Empty disables hands-free send. */
  | { type: "setVoiceSendPhrase"; value: string }
  /** Persist `grok.voiceKeyterms` (user dictionary terms only). */
  | { type: "setVoiceKeyterms"; value: string[] }
  /** Persist `grok.telemetry.enabled`. Desktop toggle; remotes do not send this. */
  | { type: "setTelemetryEnabled"; value: boolean }
  /** Persist `grok.thumbsFeedback`. Host-owned; remotes honour the desk value. */
  | { type: "setThumbsFeedback"; value: boolean }
  /**
   * Attach a user-selected file. VS Code posts a `path` (file URI or absolute)
   * from the webview drag-drop surface. Desktop posts only a host-minted
   * `handle` (see file-selection-registry) — a renderer-invented path is refused.
   */
  | { type: "dropFile"; path?: string; handle?: string; shift: boolean }
  | { type: "permissionAnswer"; requestId: number | string; optionId: string }
  | { type: "exitPlanAnswer"; requestId: number | string; verdict: "approved" | "abandoned" | "rejected"; comment?: string }
  | { type: "questionAnswer"; requestId: number | string; answers?: Record<string, string>; annotations?: Record<string, { notes?: string; preview?: string }> }
  | { type: "questionCancel"; requestId: number | string }
  | { type: "setModel"; modelId: string; provider?: "grok" | "codex" | "claude" }
  | { type: "installCodex" }
  | { type: "cancelCodexInstall" }
  | { type: "runInstallCmd" }
  | { type: "runGrokLogin"; provider?: "grok" | "codex" | "claude" }
  // Stop a headless sign-in the host is running. Only reachable while one is in
  // flight, and it kills a child process this same user started moments ago.
  | { type: "cancelDeviceLogin"; provider?: "grok" | "codex" | "claude" }
  // Paste-code half of a headless sign-in: the person typed the vendor's code
  // into the card and we write it to the CLI's stdin. Additive — an older host
  // simply has no handler, and an older client never posts it.
  | { type: "submitDeviceLoginCode"; provider?: "grok" | "codex" | "claude"; code: string }
  | { type: "logout"; provider?: "grok" | "codex" | "claude" }
  | { type: "checkGrokUpdate" }
  | { type: "updateGrok" }
  | { type: "recheckConnection"; provider?: "grok" | "codex" | "claude" }
  /** Re-observe every account without asserting anything about it. Unlike
   *  `recheckConnection` this never marks a provider connected — it re-runs the
   *  CLI locators and re-probes the credentials of accounts already connected,
   *  so Settings → Providers can be made to tell the truth on demand. */
  | { type: "refreshProviders" }
  | { type: "retryProviderSession"; provider?: "grok" | "codex" | "claude" }
  | { type: "listSessions"; offset?: number; limit?: number; providerCursor?: { grokOffset: number; codexHighWater?: { updatedAt: number; id: string } }; query?: string }
  // Preview rows for a repo the client is NOT currently in — the projects rail
  // shows a few sessions per repo without switching to it. `cwd` is matched
  // against the repo catalog and dropped when it isn't a row, so this never
  // widens what a remote can read beyond the repos it is already shown.
  | { type: "listRepoSessions"; cwd: string; limit?: number }
  // `cwd` names the session's own checkout so the host can find it without
  // assuming it lives in the repo the tab happens to be in — pinning is offered
  // on every rail row, including other projects' conversations.
  | { type: "toggleSessionPin"; id: string; cwd?: string; pinned: boolean }
  | { type: "selectRepo"; cwd: string }
  | { type: "toggleRepoPin"; cwd: string; pinned: boolean }
  // Where a project sits in the remote client's rail. Both answers are sent:
  // `archived: false` means "hold this one in view", which is a different claim
  // from never having said anything (see RepoArchiveChoice). Purely a remote
  // affordance — the VS Code repo picker neither offers it nor reads it.
  | { type: "setRepoArchived"; cwd: string; archived: boolean }
  // Folder-icon colour for a project in the conversation rail. `color` is one of
  // the host's palette ids, or "" for none (the default). Host-persisted and
  // pushed on every `repos` row — same capability pattern as setRepoArchived —
  // so the choice follows the user to a phone rather than living in browser
  // localStorage. Purely a rail affordance; the VS Code repo picker ignores it.
  | { type: "setRepoColor"; cwd: string; color: string }
  // cwd is required to reopen a worktree-isolated session (sessions are keyed
  // by cwd on disk). Omitted → host resolves from meta / workspace root.
  //
  // `claim` is additive: only an explicit user action (rail row, history pick,
  // pinned row, Continue here) sets it. A reconnect restore MUST omit it —
  // without that distinction a thawing background tab steals the conversation
  // back from the tab in the user's hand. Absent/false = today's refusal when
  // another tab already holds the session.
  | { type: "resumeSession"; id: string; cwd?: string; claim?: boolean }
  // cwd names the PROJECT the row belongs to, so a client listing several of
  // them (the browser rail) can act on a conversation without first switching
  // to its repo. Optional and additive: omitted → the host authorizes against
  // the client's selected repo, exactly as before.
  | { type: "renameSession"; id: string; name: string; cwd?: string }
  | { type: "deleteSession"; id: string; name?: string; cwd?: string }
  | { type: "clearAllSessions"; cwd: string }
  | { type: "pickFile" }
  // The composer's `@` file popover: the current token after `@`, posted on
  // every keystroke; answered by `mentionResults`.
  | { type: "mentionQuery"; query: string }
  // A popover pick: attach this workspace-relative file as an explicit chip
  // (same pipeline as drop / the + picker). The `@rel/path` text stays in the
  // composer, so the prompt carries both the prose reference and the chip.
  | { type: "addMentionFile"; relPath: string }
  /**
   * Remote file browse: list one directory under the tab's selected repo
   * (`cwd` must be that scope — see `resolveRemoteFileRoot`). `relPath`
   * optional ("" / omit = repo root). Answered by `projectDirListing`.
   */
  | { type: "listProjectDir"; requestId?: string; cwd: string; relPath?: string }
  /**
   * Remote file open: read one previewable file under the tab's selected repo.
   * Answered by `projectFileContent`. Same fence as list.
   */
  | { type: "readProjectFile"; requestId?: string; cwd: string; relPath: string }
  /**
   * Remote save of an EXISTING text file under the tab's selected repo.
   * No create / delete / rename in this pass — only rewrite content of a file
   * that already exists and was read with stamp + absPath.
   *
   * Both guards are mandatory (same as desktop `writeTreeFile`):
   * - `stamp` — "did this file change under me?" (mtime + size from the read)
   * - `expectedAbsPath` — "is this still the SAME file?" (absolute path at read;
   *   catches a tab that went stale after the desk switched projects)
   *
   * Answered by `projectFileWriteResult`. Capability: `editProjectFiles`.
   */
  | {
      type: "writeProjectFile";
      requestId?: string;
      cwd: string;
      relPath: string;
      text: string;
      stamp: { mtimeMs: number; size: number };
      expectedAbsPath: string;
    }
  | { type: "pasteImage"; mimeType: string; data: string; previewId?: string }
  // Remote browser upload: an untrusted basename plus base64 bytes. The host
  // allowlists/sanitizes/stages it, then routes it through addDroppedFile.
  | { type: "uploadFile"; name: string; data: string }
  | { type: "voiceStart" }
  /** Stop voice input. Manual Send/Queue sets discard so late transcription
   * cannot refill the composer that was just sent. */
  | { type: "voiceStop"; discard?: boolean }
  // AFK Pilot microphone input. Audio remains raw PCM16 LE / 16 kHz / mono;
  // the relay treats these opaque messages like every other WebviewMsg.
  | { type: "remoteVoiceStart" }
  | { type: "remoteVoiceChunk"; data: string }
  | { type: "remoteVoiceStop"; cancel?: boolean }
  // Host-owned send queue mutations (#37): the webview never mutates its local
  // mirror — it posts these and re-renders from the queuedSends snapshot.
  // `chips` is additive (capabilities.queueSendChips). `text` stays required so
  // an image-only queue is `{ text: "", chips }` — a v2.0.4 host still accepts
  // the type and no-ops on empty text rather than dropping an unknown message.
  | { type: "queueSend"; text: string; chips?: FileChip[] }
  // Old webviews: `index: 0` is the pending block (every host entry). Chip-aware
  // clients use `clearQueuedSends` for that block; a live host therefore treats
  // this message as the pre-split meaning.
  | { type: "dequeueSend"; index: number }
  // `restore` is additive: Stop/Edit set true so queued chips return to the
  // composer. Absent/false discards them (Remove). Older hosts ignore the field
  // and only empty the queue.
  | { type: "clearQueuedSends"; restore?: boolean }
  // Steer (#52): inject the composed text (and, additively, attachments) into
  // the RUNNING turn instead of waiting. Host-owned like the queue — the
  // webview never sends the prompt itself, so a capability gap can re-queue
  // the whole item without losing it. `chips` is additive (same as queueSend).
  // `fromQueue` marks the pending-block button so the host snapshots
  // `queuedSends` before any await (a following `clearQueuedSends` can race).
  | { type: "steerSend"; text: string; chips?: FileChip[]; fromQueue?: boolean }
  /**
   * Rate the agent turn that just finished in this process. `rating` 0 clears.
   * No bubble index: the host does not reconstruct CLI `turn_number`.
   */
  | { type: "turnFeedback"; rating: -1 | 0 | 1 }
  // Fork (#48): branch this session's conversation into a new one and focus it.
  // `sessionId` is additive: old clients omit it and keep today's path; a
  // present id that is not the dispatch-resolved session is refused.
  | { type: "forkSession"; sessionId?: string }
  // Worktree UI (P2-8): new isolated session / merge back / remove worktree.
  | { type: "newWorktreeSession" }
  | { type: "applyWorktree"; sessionId?: string }
  | { type: "removeWorktree"; sessionId?: string }
  // Rewind UI (P2-9): truncate chat + restore files.
  // `userBubbleIndex` (0-based among visible user bubbles) comes from the
  // per-message Rewind button; omit it for the gear QuickPick path.
  /** `text` is the bubble's own cleaned text, sent so the host can hand it back
   *  to the composer — rewind DISCARDS the message it targets, so without this
   *  the user silently loses what they wrote. Absent for the QuickPick path,
   *  which has no bubble to read. */
  | { type: "rewindSession"; userBubbleIndex?: number; text?: string; totalUserBubbles?: number }
  /** Edit-and-resend (#56): rewind past this (latest) user message and hand its
   *  text back to the composer. `text` is the bubble's own cleaned copy text. */
  | { type: "editLastMessage"; userBubbleIndex: number; text: string; totalUserBubbles?: number }
  /** Reply to `uiConfirmRequest`. Answerable by whichever client was shown the
   *  dialog, remote included, since 2026-09-01: the confirm moved in-chat in
   *  2.0.0, so `host-local` here did not buy a more careful check — it meant a
   *  remote could be shown a dialog it could never answer, leaving the rewind
   *  pending forever. See remote-policy.ts on rewindSession. */
  | { type: "uiConfirmAnswer"; id: string; ok: boolean }
  // Workflow card controls (P2-10): pause / resume / stop by display name.
  | { type: "workflowControl"; action: "pause" | "resume" | "stop"; displayName: string }
  /** Read-only Grok context snapshot for the open donut popover. */
  | { type: "refreshContextDetails" }
  // Relay account (gear "AFK Pilot" section, local webview only): start the
  // device-link flow / drop the device token / open the relay web portal.
  | { type: "remoteSignIn" }
  | { type: "remoteSignOut" }
  /** Desktop gear "Unlink this device…" — host confirms natively, then unlinks. */
  | { type: "unlinkRemoteDevice" }
  | { type: "openRemotePortal"; withHint?: boolean }
  /** Open the desktop release page from the update notice. Host-local — a phone
   *  cannot update the desk. */
  | { type: "openUpdateRelease"; url: string }
  /** Quit and install a downloaded desktop update. Host-local. */
  | { type: "restartToUpdate" };
