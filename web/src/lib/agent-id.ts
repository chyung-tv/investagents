import { randomBytes } from "node:crypto";

export const AGENT_HANDLE_RE = /^[a-z][a-z0-9-]{1,31}$/;

export function parseAgentHandle(raw: string): string {
  const handle = raw.trim().toLowerCase();
  if (!AGENT_HANDLE_RE.test(handle)) {
    throw new Error(
      "Handle must be 2–32 chars: start with a letter, then letters, numbers, or hyphens.",
    );
  }
  return handle;
}

export function mintAgentToken(handle: string): string {
  return `aif_${handle}_${randomBytes(16).toString("hex")}`;
}

export function agentUserId(handle: string): string {
  return `agent-${handle}`;
}
