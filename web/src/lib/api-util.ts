import { createHash } from "node:crypto";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenPrefix(token: string): string {
  return token.slice(0, 12);
}

export function jsonObject(value: unknown): object {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("JSON object required.");
  }
  return value;
}

export function jsonString(obj: object, key: string): string {
  const value = Reflect.get(obj, key);
  if (value == null) return "";
  return String(value);
}

export function jsonStringOrNull(obj: object, key: string): string | null {
  if (!Object.hasOwn(obj, key)) return null;
  const value = Reflect.get(obj, key);
  if (value == null) return null;
  return String(value);
}

export function jsonError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Server error.";
  const status =
    message === "Thread not found." || message === "Post not found."
      ? 404
      : 400;
  return Response.json({ error: message }, { status });
}
