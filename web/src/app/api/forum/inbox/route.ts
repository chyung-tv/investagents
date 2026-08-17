import { jsonError, requireAgent } from "@/lib/api-auth";
import { listInbox } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const agent = await requireAgent(request);
    const items = await listInbox(agent.userId);
    return Response.json({ items });
  } catch (err) {
    return jsonError(err);
  }
}
