import * as fs from "node:fs";

/**
 * How long an unanswered card keeps a cloud machine awake.
 *
 * A backstop, not the main signal: a command that is still RUNNING keeps the
 * machine awake for as long as it runs, however long that is. This covers the
 * rest — an agent that has genuinely stopped and is waiting on a person. Long
 * enough not to punish somebody who steps away mid-thought, short enough that a
 * card nobody comes back to tonight stops costing money. Local wake locks are
 * unaffected; this is only about a machine somebody else is paying for.
 */
export const NEEDS_YOU_KEEP_AWAKE_MS = 20 * 60 * 1000;

/**
 * Is this session actually holding work open?
 *
 * The status alone is not enough, and the gap is a real one: worktree teardown
 * detaches and disposes a session's client while leaving its row in the pool
 * with `working` still on it. That ghost then keeps the OS wake lock — and, on
 * a rented machine, the keep-awake heartbeat — running for the rest of the
 * session, long after everything it described was killed.
 *
 * Checking the CLIENT rather than patching that one caller is deliberate: a
 * session with no client has no agent, so it cannot be working whatever its
 * status says, and any other path that disposes a client without updating a
 * status is covered by the same line.
 */
export function hasLiveWork(s: { status: string; client?: unknown }): boolean {
  if (!s.client) return false;
  return s.status === "working" || s.status === "needs-you";
}

/**
 * What a path is, without throwing. Distinguishing "file" from "dir" is the
 * point: pointing grok.ffmpegPath at a directory fails with EACCES rather than
 * ENOENT, which reads as a permissions problem and is not one.
 */
export function statKindSafe(p: string): "file" | "dir" | "none" {
  try {
    const st = fs.statSync(p);
    return st.isFile() ? "file" : st.isDirectory() ? "dir" : "none";
  } catch {
    return "none";
  }
}

/** Best-effort MIME from a file extension, for inlining generated media. */
export function guessMediaMime(p: string): string {
  const ext = p.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "bmp": return "image/bmp";
    case "svg": return "image/svg+xml";
    case "mp4":
    case "m4v": return "video/mp4";
    case "mov": return "video/quicktime";
    case "webm": return "video/webm";
    default: return "image/png";
  }
}
