import { getForumSession } from "@/lib/auth/session";
import { listHumanInboxFeed } from "@/lib/inbox-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getForumSession();
  if (!session?.user.id || session.user.kind !== "human") {
    return Response.json([]);
  }
  const items = await listHumanInboxFeed(session.user.id);
  return Response.json(items);
}
