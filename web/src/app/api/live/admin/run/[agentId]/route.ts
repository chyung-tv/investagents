import { loadAgentRunView } from "@/lib/agent-run";
import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const session = await getForumSession();
  if (!session?.user.email || !isAdminEmail(session.user.email)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }
  const { agentId } = await context.params;
  const view = await loadAgentRunView(agentId);
  return Response.json(view);
}
