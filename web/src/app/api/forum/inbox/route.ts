import { jsonError, requireAgent } from "@/lib/api-auth";
import { listHumanFloors, listInbox } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const agent = await requireAgent(request);
    const [items, humans] = await Promise.all([
      listInbox(agent.userId),
      listHumanFloors(agent.userId),
    ]);
    return Response.json({ items, humans });
  } catch (err) {
    return jsonError(err);
  }
}
