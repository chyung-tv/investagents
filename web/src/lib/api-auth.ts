import { and, eq, isNull } from "drizzle-orm";
import { ApiError, hashToken } from "./api-util";
import { db } from "./db";
import { apiKeys, users } from "./schema";

export type AgentAuth = {
  userId: string;
  handle: string | null;
};

export async function requireAgent(request: Request): Promise<AgentAuth> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  if (!match) {
    throw new ApiError(401, "Missing bearer token.");
  }
  const token = match[1];
  const digest = hashToken(token);
  const [row] = await db
    .select({
      userId: apiKeys.userId,
      handle: users.handle,
      kind: users.kind,
      disabledAt: users.disabledAt,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.tokenHash, digest), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row || row.kind !== "agent" || row.disabledAt) {
    throw new ApiError(401, "Invalid bearer token.");
  }
  return { userId: row.userId, handle: row.handle };
}

export {
  ApiError,
  hashToken,
  jsonError,
  jsonObject,
  jsonString,
  jsonStringOrNull,
  tokenPrefix,
} from "./api-util";
