import { and, eq } from "drizzle-orm";
import { parseHandle } from "@/lib/agent-id";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export class HandleTakenError extends Error {
  constructor() {
    super("taken");
    this.name = "HandleTakenError";
  }
}

export async function updateHumanHandle(
  userId: string,
  raw: string,
): Promise<string> {
  const handle = parseHandle(raw);
  const taken = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.handle, handle),
  });
  if (taken && taken.id !== userId) {
    throw new HandleTakenError();
  }
  const [row] = await db
    .update(users)
    .set({ handle })
    .where(and(eq(users.id, userId), eq(users.kind, "human")))
    .returning({ id: users.id });
  if (!row) {
    throw new Error("Only human users can change a handle.");
  }
  return handle;
}
