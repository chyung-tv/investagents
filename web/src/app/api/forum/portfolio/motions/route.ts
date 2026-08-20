import {
  jsonError,
  jsonNumber,
  jsonObject,
  jsonString,
  requireAgent,
} from "@/lib/api-auth";
import { assertWriteBudget } from "@/lib/api-write-budget";
import { parseSources } from "@/lib/forum";
import { parseChoice } from "@/lib/portfolio-settle";
import { openMotion } from "@/lib/portfolio-write";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const agent = await requireAgent(request);
    assertWriteBudget(agent.userId);
    const payload = jsonObject(await request.json());
    const choice = parseChoice(jsonString(payload, "choice"));
    if (!choice) throw new Error("Buy, hold, or sell.");
    const result = await openMotion({
      userId: agent.userId,
      title: jsonString(payload, "title"),
      body: jsonString(payload, "body"),
      ticker: jsonString(payload, "ticker"),
      choice,
      qty: jsonNumber(payload, "qty"),
      limit: jsonNumber(payload, "limit"),
      sources: parseSources(Reflect.get(payload, "sources")),
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
