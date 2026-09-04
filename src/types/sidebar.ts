import type { AcpProvider } from "../acp/acp-backend";
import type { HostMsg } from "./protocol-host";
import type { ProviderHistoryCursor } from "../providers/provider-ui";
import type { RemotePcmIngress } from "../remote/remote-voice";
import type { Session } from "../session/session";
import type { PcmVoiceStreamer } from "../voice/voice-streamer";

export interface RemoteVoiceEntry {
  credentialCwd: string;
  session: Session;
  streamer: PcmVoiceStreamer;
  ingress: RemotePcmIngress;
  phrase: string;
  keyterms: string[];
  language?: string;
  finalizing: boolean;
}

export interface SessionLoadReservation {
  token: symbol;
  ownerTabToken?: string;
  session?: Session;
  completion: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

export type RemoteResumeTarget =
  | { kind: "conflict"; selectedCwd: string; ownerId: string; session: Session }
  | { kind: "repo-mismatch"; selectedCwd: string }
  | { kind: "live"; selectedCwd: string; session: Session }
  | { kind: "disk"; selectedCwd: string; actualCwd: string; provider: AcpProvider }
  | { kind: "missing"; selectedCwd: string };

export interface RemoteRequester {
  clientId: string;
  tabToken?: string;
}

/** Resolved at commit time, AFTER any await. Undefined means the tab that asked
 *  is gone and the attachment must be dropped — never redirected. */
export type AttachmentOwner = () => Session | undefined;

export interface RemoteBrowserPreferences {
  fontScale: number;
  readRepliesAloud: boolean;
  summarizeRepliesAloud: boolean;
  usesTouch: boolean;
}

export interface CliCompatibilityResult {
  planModeAvailable: boolean;
  planModeUnavailableReason?: string;
  /** True only after a live parseable `--version`. A cache stand-in stays false. */
  planModeVersionVerified: boolean;
  /** True when Plan availability came from `grok.cliVersionCache`, not a live `--version`. */
  usedCache?: boolean;
  /**
   * Parseable `X.Y.Z` from this probe (live or cache). Absent when unknown.
   * Display / Plan only — initialize must not see this unless
   * `planModeVersionVerified` is true.
   */
  cliVersion?: string;
}

export interface SessionsListOptions {
  offset?: number;
  limit?: number;
  query?: string;
  providerCursor?: ProviderHistoryCursor;
}

export type GrokSessionsListOptions = Omit<SessionsListOptions, "providerCursor">;
export type GrokSessionsListMessage = Extract<HostMsg, { type: "sessions" }>;
