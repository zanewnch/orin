// Single source of truth for the host <-> webview message contract.
//
// Two directions, two discriminated unions:
//   - HostMsg     — posted by the extension host (sidebar.ts) to the webview.
//   - WebviewMsg  — posted by the webview (chat.js) back to the host.
//
// Shapes live in types/protocol-shapes.ts; the unions in types/protocol-host.ts
// and types/protocol-webview.ts. This file keeps the exhaustive runtime maps
// and is still the import path everything else uses.
//
// Why the maps live here: the host->webview direction used to be `post(msg: any)`,
// so a typo'd field or a renamed shape only surfaced as a silently mis-rendered
// (or dropped) message in the webview. Typing `post`/`emit` against HostMsg
// turns those into compile errors. The exhaustive `Record<Union["type"], true>`
// maps force the runtime *_MESSAGE_TYPES arrays to list exactly the union's
// discriminants. test/protocol.test.ts asserts the webview copy in
// media/webview-helpers.js matches, and that chat.js handles every HostMsg type.
//
// All payload-shape imports are `import type` so this module's runtime is
// just the two arrays plus HOST_CAPABILITIES / error codes.

export type {
  GithubRepoView,
  GithubState,
  HostErrorCode,
  HostUiCapabilities,
  PlanHistoryItem,
  ProjectSetupGithub,
  QueuedSend,
  ToolCallPayload,
} from "./types/protocol-shapes";
export {
  HOST_CAPABILITIES,
  INTERRUPTED_SEND_CODE,
  SESSION_SUPERSEDED_CODE,
} from "./types/protocol-shapes";
export type { HostMsg } from "./types/protocol-host";
export type { WebviewMsg } from "./types/protocol-webview";

import type { HostMsg } from "./types/protocol-host";
import type { WebviewMsg } from "./types/protocol-webview";

// Exhaustive maps: `Record<Union["type"], true>` forces every discriminant to be
// a key (missing -> tsc error) and forbids any extra (excess-property -> tsc
// error). The runtime arrays are just the keys, so they can never drift from the
// union without failing the build.
const HOST_MESSAGE_TYPE_MAP: Record<HostMsg["type"], true> = {
  initialState: true, moveViewHint: true, welcomeTips: true, projectSetup: true, githubState: true, githubRepos: true, providerState: true, mcpServers: true, mcpConnectors: true, routines: true, codexInstallProgress: true, planModeAvailability: true, showThinking: true, appPurpose: true, fontScale: true, grokUpdateStatus: true, updateAvailable: true, updateReady: true, telemetryEnabled: true, thumbsFeedback: true,
  initialized: true, cliUpdating: true, session: true, sessionName: true, modelChanged: true,
  modeChanged: true, openModePopover: true, voiceState: true, voiceConfigured: true,
  voicePartial: true, voiceSubmit: true, voiceTranscript: true, voiceError: true,
  chips: true, commandsUpdate: true, mentionResults: true, projectDirListing: true, projectFileContent: true, projectFileWriteResult: true, userMessage: true, agentStart: true,
  thoughtChunk: true, messageChunk: true, media: true, userMessageChunk: true,
  historyReplay: true, historyBatch: true, permissionHistoryQueue: true, planHistoryQueue: true,
  toolCall: true, toolCallUpdate: true, permissionRequest: true, permissionOptions: true,
  permissionResolved: true, exitPlanRequest: true, planResolved: true, questionRequest: true,
  planNotice: true, autoCompactNotice: true, planBlocked: true, promptComplete: true, contextUsage: true, agentReset: true,
  agentError: true, agentEnd: true, exit: true, setBusy: true, summarizing: true,
  sessionContext: true, clearMessages: true, onboarding: true, error: true, hostNotice: true,
  xaiNotification: true, subagentUpdate: true, childStream: true, runProgress: true, commandOutput: true, expandCommandOutputs: true, steerByDefault: true,
  soundNotifications: true, processingSound: true, readRepliesAloud: true, summarizeRepliesAloud: true, speechSummary: true, imageFull: true, moveComposerCaret: true, remoteStatus: true,
  setAllToolDetails: true, focusInput: true, findInSession: true, restoreComposer: true, truncateMessages: true, uiConfirmRequest: true,
  sessions: true, repoSessions: true, pinnedSessions: true, repos: true, sessionDot: true, queuedSends: true, submitQueuedSend: true,
  steerUnavailable: true, feedbackAvailability: true, turnFeedbackAck: true, usage: true,
};

const WEBVIEW_MESSAGE_TYPE_MAP: Record<WebviewMsg["type"], true> = {
  ready: true, remotePreferences: true, send: true, newSession: true, cancel: true, pickModel: true,
  setMode: true, removeChip: true, toggleChip: true, openFile: true, showInFolder: true, openUrl: true,
  openText: true, openDiff: true, exportExpr: true, setEffort: true, openGlobalConfig: true,
  addProjectFolder: true, removeProjectFolder: true, createProject: true, cloneProject: true, setupGithubCli: true, listGithubRepos: true, githubSignOut: true, githubLoginWithToken: true,
  openProjectConfig: true, listMcpServers: true, connectMcpConnector: true, disconnectMcpConnector: true,
  listRoutines: true, saveRoutine: true, deleteRoutine: true, setRoutinePaused: true, runRoutineNow: true, showLogs: true, toggleDevTools: true, openSettings: true, openSettingsSurface: true, closeSettingsSurface: true, dismissWelcomeTip: true, welcomeTipShown: true, moveView: true,
  setShowThinking: true, setAppPurpose: true, setExpandCommandOutputs: true, setSteerByDefault: true,
  setSoundNotifications: true, setProcessingSound: true, setReadRepliesAloud: true, setSummarizeRepliesAloud: true, setVoiceSendPhrase: true, setVoiceKeyterms: true, setTelemetryEnabled: true, setThumbsFeedback: true, summarizeSpeech: true, requestImageFull: true, composerFocus: true,
  dropFile: true, permissionAnswer: true, exitPlanAnswer: true, questionAnswer: true,
  questionCancel: true, setModel: true, installCodex: true, cancelCodexInstall: true, runInstallCmd: true, runGrokLogin: true,
  cancelDeviceLogin: true, submitDeviceLoginCode: true,
  logout: true, checkGrokUpdate: true, updateGrok: true, recheckConnection: true, refreshProviders: true, retryProviderSession: true,
  listSessions: true, listRepoSessions: true, selectRepo: true, toggleRepoPin: true, toggleSessionPin: true,
  setRepoArchived: true, setRepoColor: true,
  resumeSession: true, renameSession: true, deleteSession: true,
  clearAllSessions: true, pickFile: true, mentionQuery: true, addMentionFile: true,
  listProjectDir: true, readProjectFile: true, writeProjectFile: true,
  pasteImage: true, uploadFile: true, voiceStart: true,
  voiceStop: true, remoteVoiceStart: true, remoteVoiceChunk: true,
  remoteVoiceStop: true, queueSend: true, dequeueSend: true, clearQueuedSends: true,
  steerSend: true, turnFeedback: true, forkSession: true,
  newWorktreeSession: true, applyWorktree: true, removeWorktree: true,
  rewindSession: true, editLastMessage: true, uiConfirmAnswer: true, workflowControl: true,
  refreshContextDetails: true,
  remoteSignIn: true, remoteSignOut: true, unlinkRemoteDevice: true, openRemotePortal: true,
  openUpdateRelease: true, restartToUpdate: true,
};

export const HOST_MESSAGE_TYPES: readonly HostMsg["type"][] = Object.keys(HOST_MESSAGE_TYPE_MAP) as HostMsg["type"][];
export const WEBVIEW_MESSAGE_TYPES: readonly WebviewMsg["type"][] = Object.keys(WEBVIEW_MESSAGE_TYPE_MAP) as WebviewMsg["type"][];
