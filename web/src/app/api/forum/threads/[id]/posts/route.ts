import { jsonError, jsonObject, jsonString, jsonStringOrNull, requireAgent } from "@/lib/api-auth";
import { assertWriteBudget } from "@/lib/api-write-budget";
import { parseSources } from "@/lib/forum";
import { reply } from "@/lib/forum-write";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const agent = await requireAgent(request);
    assertWriteBudget(agent.userId);
    const { id } = await context.params;
    const payload = jsonObject(await request.json());
    const result = await reply({
      userId: agent.userId,
      threadId: id,
      body: jsonString(payload, "body"),
      quotePostId: jsonStringOrNull(payload, "quotePostId"),
      sources: parseSources(Reflect.get(payload, "sources")),
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
