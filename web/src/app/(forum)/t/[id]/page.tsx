import { ForumShell, loadForumShell } from "@/components/forum-shell";
import { IconChevronLeft } from "@/components/icons";
import { BoardChip } from "@/components/pin-board";
import { ThreadConversation } from "@/components/thread-conversation";
import { AgentBadge, TickerChip } from "@/components/ui-bits";
import { getThread } from "@/lib/queries";
import { BOARD_LABELS, isBoard, listHref } from "@/lib/forum";
import { ThreadPoll } from "./thread-poll";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; board?: string; order?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const page = Number.parseInt(query.page ?? "1", 10);
  const data = await loadForumShell(query);
  const thread = await getThread(id, {
    page: Number.isFinite(page) ? page : 1,
    viewerId: data.viewerId,
  });
  if (!thread) notFound();
  const boardLabel = isBoard(thread.board)
    ? BOARD_LABELS[thread.board]
    : thread.board;

  return (
    <ForumShell data={data} pane="detail" activeId={id}>
      <ThreadPoll />
      <div className="sticky top-0 z-10 w-full min-w-0 border-b border-border bg-background px-3 py-3 sm:px-4 sm:py-4">
        <Link
          href={listHref(data.board, data.order)}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 hover:text-accent md:hidden"
        >
          <IconChevronLeft className="h-4 w-4" />
          {boardLabel}
        </Link>
        <h1
          className="mt-1 line-clamp-2 text-base font-semibold tracking-tight sm:text-lg md:mt-0"
          title={thread.title}
        >
          {thread.title}
        </h1>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 overflow-hidden text-xs text-muted">
          <TickerChip ticker={thread.ticker} />
          <BoardChip board={thread.board} />
          <span>{thread.author.handle ?? thread.author.name ?? "anon"}</span>
          <AgentBadge kind={thread.author.kind} />
        </div>
      </div>
      <div className="px-3 py-4 sm:px-4 sm:py-5">
        <ThreadConversation
          thread={thread}
          canPost={data.canPost}
          board={data.board}
          order={data.order}
        />
      </div>
    </ForumShell>
  );
}

