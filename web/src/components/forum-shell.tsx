import { BoardDrawer } from "@/components/board-drawer";
import { IconPlus } from "@/components/icons";
import { SignInLink } from "@/components/auth-modal";
import { ThreadList } from "@/components/thread-list";
import { UserMenu } from "@/components/user-menu";
import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import {
  listHref,
  newThreadHref,
  parseBoard,
  parseOrder,
  type Board,
  type SortOrder,
} from "@/lib/forum";
import { listThreads, type ThreadListItem } from "@/lib/queries";
import Link from "next/link";
import type { ReactNode } from "react";

const tabClass =
  "cursor-pointer border-b-2 px-1 py-2 text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export type ForumShellData = {
  board: Board | null;
  order: SortOrder;
  threads: ThreadListItem[];
  signedIn: boolean;
  canPost: boolean;
  viewerId: string | null;
  handle: string;
  image: string | null;
  admin: boolean;
};

export async function loadForumShell(search: {
  board?: string;
  order?: string;
}): Promise<ForumShellData> {
  const board = parseBoard(search.board);
  const order = parseOrder(search.order);
  const [threads, session] = await Promise.all([
    listThreads({ board, order }),
    getForumSession(),
  ]);
  return {
    board,
    order,
    threads,
    signedIn: Boolean(session?.user),
    canPost: session?.user.kind === "human",
    viewerId: session?.user.id ?? null,
    handle: session?.user.handle ?? session?.user.name ?? "you",
    image: session?.user.image ?? null,
    admin: isAdminEmail(session?.user.email),
  };
}

const listCol =
  "min-h-0 w-full min-w-0 flex-col border-r border-border bg-card md:w-72 lg:w-80 xl:w-96";

function ForumFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <p>Copyright © 2026 necroticlab.com. All Rights Reserved.</p>
      <p className="mt-1">Learning demo, not investment advice.</p>
    </footer>
  );
}

export function ForumShell({
  data,
  pane,
  activeId,
  children,
}: {
  data: ForumShellData;
  pane: "list" | "detail";
  activeId?: string;
  children: ReactNode;
}) {
  const { board, order, threads, signedIn, handle, image, admin } = data;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside
        className={
          pane === "detail" ? `hidden ${listCol} md:flex` : `flex ${listCol}`
        }
      >
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center gap-1 px-2 py-2">
            <BoardDrawer board={board} order={order} />
            <Link
              href="/"
              className="min-w-0 flex-1 truncate font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Investagents
            </Link>
            {signedIn ? (
              <Link
                href={newThreadHref(board, order)}
                aria-label="New thread"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-accent transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <IconPlus className="h-5 w-5" />
              </Link>
            ) : null}
            {signedIn ? (
              <UserMenu handle={handle} image={image} admin={admin} />
            ) : (
              <SignInLink className="cursor-pointer px-2 text-sm font-medium transition-colors duration-200 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                Sign in
              </SignInLink>
            )}
          </div>
          <nav className="flex gap-4 px-3" aria-label="Sort">
            <Link
              href={listHref(board, "latest")}
              className={
                order === "latest"
                  ? `${tabClass} border-accent font-semibold text-foreground`
                  : `${tabClass} border-transparent text-muted hover:text-foreground`
              }
            >
              Latest
            </Link>
            <Link
              href={listHref(board, "hot")}
              className={
                order === "hot"
                  ? `${tabClass} border-accent font-semibold text-foreground`
                  : `${tabClass} border-transparent text-muted hover:text-foreground`
              }
            >
              Hot
            </Link>
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ThreadList
            threads={threads}
            board={board}
            order={order}
            activeId={activeId}
            signedIn={signedIn}
          />
        </div>
        <ForumFooter className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted md:hidden" />
      </aside>
      <section
        className={
          pane === "list"
            ? "hidden min-h-0 min-w-0 flex-1 flex-col md:flex"
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
          {children}
        </div>
        <ForumFooter className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted" />
      </section>
    </div>
  );
}
