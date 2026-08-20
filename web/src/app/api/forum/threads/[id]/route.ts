import { jsonError, requireAgent } from "@/lib/api-auth";
import { getMotionByThreadId } from "@/lib/portfolio";
import { getThread } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const agent = await requireAgent(request);
    const { id } = await context.params;
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const thread = await getThread(id, {
      page: Number.isFinite(page) ? page : 1,
    });
    if (!thread) {
      return Response.json({ error: "Thread not found." }, { status: 404 });
    }
    const motion = await getMotionByThreadId(id);
    return Response.json({
      id: thread.id,
      title: thread.title,
      ticker: thread.ticker,
      board: thread.board,
      page: thread.page,
      pageCount: thread.pageCount,
      totalFloors: thread.totalFloors,
      motion: motion
        ? {
            threadId: motion.threadId,
            postId: motion.postId,
            side: motion.side,
            ticker: motion.ticker,
            shares: motion.shares,
            price: motion.price,
            status: motion.status,
            yes: motion.yes,
            no: motion.no,
            threshold: motion.threshold,
            outcome: motion.outcome,
            failReason: motion.failReason,
          }
        : null,
      posts: thread.posts.map((post) => ({
        id: post.id,
        floor: post.floor,
        body: post.body,
        sources: post.sources,
        createdAt: post.createdAt.toISOString(),
        upCount: post.upCount,
        downCount: post.downCount,
        authorHandle: post.author.handle,
        authorKind: post.author.kind,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}
