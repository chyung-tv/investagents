import {
  handleAuthProxyRequest,
  parseSessionData,
} from "@neondatabase/auth/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth/server";
import { readSessionWithFallback } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { HANDLE_RE, isReservedHandle } from "@/lib/agent-id";
import { users } from "@/lib/schema";

export type ForumUser = {
  id: string;
  kind: "human" | "agent";
  handle: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
};

function slugHandle(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return slug || "user";
}

async function uniqueHandle(base: string, userId: string): Promise<string> {
  let handle = HANDLE_RE.test(base) && !isReservedHandle(base) ? base : `user-${userId.slice(0, 6)}`;
  for (let n = 0; n < 8; n += 1) {
    const taken = await db.query.users.findFirst({
      where: eq(users.handle, handle),
    });
    if (!taken || taken.id === userId) return handle;
    handle = `user-${userId.slice(0, 4)}${n || ""}`;
  }
  return `user-${userId.slice(0, 8)}`;
}

export async function ensureForumUser(input: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): Promise<ForumUser> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, input.id),
  });
  if (existing) {
    const name = input.name ?? existing.name;
    const email = input.email ?? existing.email;
    const image = input.image ?? existing.image;
    if (
      name !== existing.name ||
      email !== existing.email ||
      image !== existing.image
    ) {
      await db
        .update(users)
        .set({ name, email, image })
        .where(eq(users.id, input.id));
    }
    return {
      id: existing.id,
      kind: existing.kind === "agent" ? "agent" : "human",
      handle: existing.handle,
      name,
      email,
      image,
    };
  }
  const base = slugHandle(
    input.name || input.email?.split("@")[0] || input.id,
  );
  const handle = await uniqueHandle(base, input.id);
  await db.insert(users).values({
    id: input.id,
    name: input.name ?? null,
    email: input.email ?? null,
    image: input.image ?? null,
    kind: "human",
    handle,
  });
  return {
    id: input.id,
    kind: "human",
    handle,
    name: input.name ?? null,
    email: input.email ?? null,
    image: input.image ?? null,
  };
}

type AuthSessionUser = {
  id?: unknown;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AuthSessionPayload = {
  user?: AuthSessionUser | null;
} | null;

async function requestFromIncomingHeaders(): Promise<Request> {
  const headerStore = await headers();
  const requestHeaders = new Headers();
  for (const name of ["cookie", "origin", "referer", "user-agent"] as const) {
    const value = headerStore.get(name);
    if (value) requestHeaders.set(name, value);
  }
  return new Request("http://forum.invalid/api/auth/get-session", {
    method: "GET",
    headers: requestHeaders,
  });
}

async function readAuthSessionWithoutCookieWrite(): Promise<AuthSessionPayload> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) return null;
  const response = await handleAuthProxyRequest({
    request: await requestFromIncomingHeaders(),
    path: "get-session",
    baseUrl,
    cookieSecret,
    sameSite: "lax",
  });
  if (!response.ok) return null;
  const json: unknown = await response.json().catch(() => null);
  const parsed = parseSessionData(json);
  return parsed.user ? parsed : null;
}

async function readAuthSession(): Promise<AuthSessionPayload> {
  return readSessionWithFallback(async () => {
    const { data } = await auth.getSession();
    return data;
  }, readAuthSessionWithoutCookieWrite);
}

export const getForumSession = cache(async function getForumSession(): Promise<{
  user: ForumUser;
} | null> {
  const session = await readAuthSession();
  if (!session?.user?.id) return null;
  const user = await ensureForumUser({
    id: String(session.user.id),
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  });
  return { user };
});
