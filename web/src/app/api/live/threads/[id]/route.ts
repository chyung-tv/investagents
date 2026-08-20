import { getForumSession } from "@/lib/auth/session";
import { getThread } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const session = await getForumSession();
  const thread = await getThread(id, {
    page: Number.isFinite(page) ? page : 1,
    viewerId: session?.user.id ?? null,
  });
  if (!thread) {
    return Response.json({ error: "Thread not found." }, { status: 404 });
  }
  return Response.json(thread);
}
