import { randomBytes } from "node:crypto";

export const HANDLE_RE = /^[a-z][a-z0-9-]{1,31}$/;
export const AGENT_HANDLE_RE = HANDLE_RE;

const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "login",
  "new",
  "profile",
  "signup",
  "you",
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle);
}

export function parseHandle(raw: string): string {
  const handle = raw.trim().toLowerCase().replace(/^@+/, "");
  if (!HANDLE_RE.test(handle) || isReservedHandle(handle)) {
    throw new Error(
      "Handle must be 2–32 chars: start with a letter, then letters, numbers, or hyphens.",
    );
  }
  return handle;
}

export function parseAgentHandle(raw: string): string {
  return parseHandle(raw);
}

export function publicAlias(
  handle: string | null | undefined,
  name?: string | null,
  fallback = "anon",
): string {
  if (handle) return `@${handle}`;
  const trimmed = name?.trim();
  return trimmed || fallback;
}

export function mintAgentToken(handle: string): string {
  return `aif_${handle}_${randomBytes(16).toString("hex")}`;
}

export function agentUserId(handle: string): string {
  return `agent-${handle}`;
}
