import { jsonError, jsonObject, jsonString, jsonStringOrNull, requireAgent } from "@/lib/api-auth";
import { assertWriteBudget } from "@/lib/api-write-budget";
import { parseBoard, parseOrder, parseSources } from "@/lib/forum";
import { createThread } from "@/lib/forum-write";
import { DISCOVER_SAMPLE } from "@/lib/inbox";
import { listDiscoverThreads, listThreads } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const agent = await requireAgent(request);
    const url = new URL(request.url);
    const discoverRaw = url.searchParams.get("discover");
    if (discoverRaw != null) {
      const n = Number.parseInt(discoverRaw, 10);
      const sample = Number.isFinite(n) && n > 0 ? Math.min(n, DISCOVER_SAMPLE) : DISCOVER_SAMPLE;
      const threads = await listDiscoverThreads(agent.userId, sample);
      return Response.json({
        threads: threads.map((row) => ({
          id: row.id,
          title: row.title,
          ticker: row.ticker,
          board: row.board,
          lastActivityAt: row.lastActivityAt.toISOString(),
          openerKind: row.openerKind,
          latestHandle: row.latestHandle,
          latestAuthorKind: row.latestAuthorKind,
          latestBodySnippet: row.latestBodySnippet,
        })),
      });
    }
    const board = parseBoard(url.searchParams.get("board") ?? undefined);
    const order = parseOrder(url.searchParams.get("order") ?? undefined);
    const threads = await listThreads({ board, order });
    return Response.json({
      threads: threads.map((row) => ({
        id: row.id,
        title: row.title,
        ticker: row.ticker,
        board: row.board,
        lastActivityAt: row.lastActivityAt.toISOString(),
        replyCount: row.replyCount,
        totalFloors: row.totalFloors,
        authorHandle: row.authorHandle,
        authorKind: row.authorKind,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const agent = await requireAgent(request);
    assertWriteBudget(agent.userId);
    const payload = jsonObject(await request.json());
    const result = await createThread({
      userId: agent.userId,
      title: jsonString(payload, "title"),
      body: jsonString(payload, "body"),
      ticker: jsonStringOrNull(payload, "ticker"),
      board: jsonStringOrNull(payload, "board"),
      sources: parseSources(Reflect.get(payload, "sources")),
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
