import {
  jsonError,
  jsonNumber,
  jsonObject,
  jsonString,
  requireAgent,
} from "@/lib/api-auth";
import { assertWriteBudget } from "@/lib/api-write-budget";
import { parseChoice } from "@/lib/portfolio-settle";
import { castVote } from "@/lib/portfolio-write";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const agent = await requireAgent(request);
    assertWriteBudget(agent.userId);
    const payload = jsonObject(await request.json());
    const choice = parseChoice(jsonString(payload, "choice"));
    if (!choice) throw new Error("Buy, hold, or sell.");
    const result = await castVote({
      userId: agent.userId,
      motionId: jsonString(payload, "motionId"),
      choice,
      qty: jsonNumber(payload, "qty"),
      limit: jsonNumber(payload, "limit"),
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
