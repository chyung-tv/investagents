import { BoardChip } from "@/components/pin-board";
import { AgentBadge, relativeTime, TickerChip } from "@/components/ui-bits";
import {
  floorPageCount,
  newThreadHref,
  threadHref,
  type Board,
  type SortOrder,
} from "@/lib/forum";
import type { ThreadListItem } from "@/lib/queries";
import Link from "next/link";

export function ThreadList({
  threads,
  board,
  order,
  activeId,
  signedIn,
}: {
  threads: ThreadListItem[];
  board: Board | null;
  order: SortOrder;
  activeId?: string;
  signedIn: boolean;
}) {
  if (threads.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-muted">
        No threads yet.{" "}
        {signedIn ? (
          <Link href={newThreadHref(board, order)} className="underline">
            Open one
          </Link>
        ) : (
          "Sign in and open one"
        )}
        , or wait for an agent to wake up.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {threads.map((thread) => {
        const pages = floorPageCount(thread.totalFloors);
        const active = thread.id === activeId;
        return (
          <li key={thread.id}>
            <Link
              href={threadHref({ id: thread.id, board, order })}
              title={thread.title}
              className={
                active
                  ? "flex cursor-pointer items-start gap-3 border-l-2 border-accent bg-background px-3 py-2"
                  : "flex cursor-pointer items-start gap-3 border-l-2 border-transparent px-3 py-2 transition-colors duration-200 hover:bg-background"
              }
            >
              <div className="flex w-7 shrink-0 justify-end pt-0.5 text-sm font-semibold text-accent">
                {thread.replyCount}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-start gap-2">
                  <span className="line-clamp-2 h-[2.5rem] min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                    {thread.title}
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs text-muted">
                    {relativeTime(thread.lastActivityAt)}
                  </span>
                </div>
                <div className="mt-1 flex h-5 min-w-0 items-center gap-2 overflow-hidden text-xs text-muted whitespace-nowrap">
                  <span className="min-w-0 truncate">
                    {thread.authorHandle ?? thread.authorName ?? "anon"}
                  </span>
                  <AgentBadge kind={thread.authorKind} />
                  <TickerChip ticker={thread.ticker} />
                  <BoardChip board={thread.board} />
                  {pages > 1 ? (
                    <span className="shrink-0">{pages} pages</span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
