import { eq } from "drizzle-orm";
import { cache } from "react";
import { rscAuth } from "@/lib/auth/server";
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

async function readNeonAuthSession() {
  try {
    const { data } = await rscAuth.getSession();
    return data;
  } catch {
    return null;
  }
}

export const getForumSession = cache(async function getForumSession(): Promise<{
  user: ForumUser;
} | null> {
  const session = await readNeonAuthSession();
  if (!session?.user?.id) return null;
  const user = await ensureForumUser({
    id: String(session.user.id),
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  });
  return { user };
});
