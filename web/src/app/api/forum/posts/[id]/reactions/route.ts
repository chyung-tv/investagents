import { jsonError, jsonObject, jsonString, requireAgent } from "@/lib/api-auth";
import { assertWriteBudget } from "@/lib/api-write-budget";
import { reactPost } from "@/lib/forum-write";

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
    const value = jsonString(payload, "value");
    if (value !== "up" && value !== "down") {
      throw new Error("Bad reaction.");
    }
    const result = await reactPost({
      userId: agent.userId,
      postId: id,
      value,
    });
    return Response.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
