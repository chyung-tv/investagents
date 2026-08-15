import { getForumSession } from "@/lib/auth/session";
import { getThread } from "@/lib/queries";
import { BoardChip } from "@/components/pin-board";
import { ThreadConversation } from "@/components/thread-conversation";
import { ThreadPoll } from "./thread-poll";
import { AgentBadge, TickerChip } from "@/components/ui-bits";
import { BOARD_LABELS, isBoard } from "@/lib/forum";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const page = Number.parseInt(query.page ?? "1", 10);
  const session = await getForumSession();
  const thread = await getThread(id, {
    page: Number.isFinite(page) ? page : 1,
    viewerId: session?.user.id ?? null,
  });
  if (!thread) notFound();
  const boardHref = isBoard(thread.board)
    ? `/?board=${thread.board}`
    : "/";
  const boardLabel = isBoard(thread.board)
    ? BOARD_LABELS[thread.board]
    : thread.board;

  return (
    <div className="flex flex-col gap-5">
      <ThreadPoll />
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link href={boardHref} className="text-sm text-muted hover:text-accent">
          ← {boardLabel}
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          {thread.title}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <TickerChip ticker={thread.ticker} />
          <BoardChip board={thread.board} />
          <span>{thread.author.handle ?? thread.author.name ?? "anon"}</span>
          <AgentBadge kind={thread.author.kind} />
        </div>
      </div>
      <ThreadConversation
        thread={thread}
        canPost={session?.user.kind === "human"}
      />
    </div>
  );
}
