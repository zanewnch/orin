export const SESSION_META_KEY = "grok.sessionMeta";
export const PROVIDER_CONNECTIONS_KEY = "grok.providerConnections";
export const PROVIDER_MODEL_CACHE_KEY = "grok.providerModelCache";
export const PROJECT_PROVIDER_DEFAULTS_KEY = "grok.projectProviderDefaults";
export const REPO_PINS_KEY = "grok.repoPins";
/** Shared client-state key for the remote rail's Archived section. Stored under
 *  ~/.grok/client-state so the choice follows you to a phone and survives a
 *  cleared browser — archiving
 *  is curation of your projects, not a preference about one sidebar. Read by the
 *  browser client only; the VS Code repo picker ignores it entirely. */
export const REPO_ARCHIVES_KEY = "grok.repoArchives";
/** Shared client-state key for per-project folder colours in the conversation
 *  rail. Stored under ~/.grok/client-state so the choice follows you to a phone
 *  and survives a cleared browser — same home as pins/archives. Both desktop
 *  and VS Code host this (unlike archives, which desktop strips because open/
 *  close already owns the curated list). */
export const REPO_COLORS_KEY = "grok.repoColors";
/**
 * Folders the user added to the rail by hand, on a host that cannot open them.
 *
 * Desktop "Add project" changes the app's OWN workspace, so it needs no list —
 * `workspaceFolders()` is the list. VS Code's workspace belongs to VS Code, and
 * adding a folder to it converts a single-folder window into a multi-root one
 * and reloads the extension host, which is a violent answer to "show me this
 * project in the rail". So VS Code records the folder here instead: it joins
 * `trustedCwds` and appears as an ordinary catalog row, VS Code's own Explorer
 * is untouched, and nothing reloads.
 *
 * **It does grant reach, and that is the point.** An earlier version of this
 * comment claimed otherwise on the grounds that `localTrustedSessionCwds`
 * already trusts the whole discovered catalog — true, but the folder this
 * feature adds is precisely the one Grok has NEVER run in, so it was not in
 * that catalog and is now. It becomes selectable, and through the phone,
 * browsable and editable like any other project. That is what the user asked
 * for by picking it. What it must therefore also be is REVOCABLE — see
 * {@link GrokSidebar.forgetExtraProjectFolder}, reachable from the rail's ⋯
 * menu on exactly the rows that came from here.
 *
 * Absent from `DISK_KEYS`, so it lives in `globalState` rather than the shared
 * `~/.grok/client-state` that pins and colours use. Deliberate: pins and colours
 * are curation you want to follow you to the phone, this is a workaround for one
 * editor's inability to show a folder it has not opened. Desktop filters it out
 * anyway (`localRepoCatalogEntries` keeps only open folders there), so sharing
 * it would move bytes around for no effect.
 */
export const EXTRA_PROJECT_FOLDERS_KEY = "grok.extraProjectFolders";
/**
 * Folders the user has explicitly REMOVED from the rail, which stay removed.
 *
 * Dropping the added-folder record was not enough to make "Hide project" mean
 * anything. VS Code's catalog is discovered from Grok's own session history, so
 * the moment anything ran in that folder the row came back on its own — and a
 * phone selecting the project is enough to create that history, because
 * `selectRemoteRepo` opens or starts a session there. So a remote could make its
 * own access permanent by selecting a newly added project before the user
 * thought better of it, and the returning row carried no `added` marker, so the
 * rail no longer offered to remove it.
 *
 * A tombstone is the only thing that survives that. Nothing on disk is touched
 * and no conversation is deleted — the project is simply not listed, and
 * therefore not trusted, until the user adds the folder again, which clears it.
 * VS Code-local like its counterpart: absent from `DISK_KEYS`, so it lives in
 * `globalState` rather than the shared client-state.
 */
export const REMOVED_PROJECT_FOLDERS_KEY = "grok.removedProjectFolders";
/** Shared client-state key for the anonymous per-install telemetry GUID (survives
 *  updates and identifies this machine across clients).
 *
 *  This is MACHINE identity, not DEVICE identity. The relay REVOKES every device
 *  row carrying the same install id when a link is approved (that is how a
 *  re-link retires its own stale predecessor instead of hitting the free tier's
 *  device cap). So a second client on this machine must NOT send this value
 *  verbatim to `/api/link/start` — it would revoke the extension's device and
 *  drop its uplink, and re-linking here would revoke that client's in turn.
 *  Send a discriminated form (`<id>:desktop`) and leave the bare id to the
 *  extension, whose already-linked rows store it bare. */
export const INSTALL_ID_KEY = "grok.installId";
/** VS Code-local globalState key for the eye-off choice on the active-editor context chip.
 *  The chip is rebuilt from scratch on every file switch, so the user's "don't
 *  send this" has to live outside it or every switch silently re-enables the
 *  file — the #67 complaint. Persisted (not per-session) because a preference
 *  this deliberate should survive a reload, exactly like the setting would. */
export const IMPLICIT_CHIP_HIDDEN_KEY = "grok.implicitChipHidden";
/** One helpful warning per install, even though every pooled process initializes. */
export const OAUTH_SHADOW_WARNING_KEY = "grok.oauthShadowWarningShown";

// History pagination: rows fetched per "page" (initial open + each load-more / search page).
export const SESSION_PAGE_SIZE = 100;

/** Rows a `listRepoSessions` preview returns when the client names no limit —
 *  the projects rail shows a few per repo and links out for the rest. */
export const REPO_PREVIEW_SIZE = 3;

/** How long a cancelled turn may go unanswered before the host settles it
 *  itself. Generous: an honoured cancel comes back well inside a second, so this
 *  only ever fires when the turn was going to wedge anyway. */
export const CANCEL_SETTLE_GRACE_MS = 10_000;

// Records the extension version at the last silent CLI-update check. A fresh
// install establishes the baseline; a later extension upgrade updates once.
export const CLI_UPDATE_VERSION_KEY = "grok.cliUpdateExtVersion";

// grok's non-plan ("act") mode id on the wire. The CLI reports this via
// current_mode_update after leaving plan mode (verified against grok 0.2.3 —
// see research/plan-mode.md). The UI labels it "Agent"; the wire calls it
// "default".
export const ACT_MODE_ID = "default";
