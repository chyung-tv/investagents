import { BoardDrawer } from "@/components/board-drawer";
import { BookStrip } from "@/components/book-strip";
import { IconPlus } from "@/components/icons";
import { LocaleToggle } from "@/components/locale-toggle";
import { SignInLink } from "@/components/auth-modal";
import { ThreadList } from "@/components/thread-list";
import { UserMenu } from "@/components/user-menu";
import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { getMessages } from "@/i18n/get-locale";
import {
  listHref,
  newThreadHref,
  parseBoard,
  parseOrder,
  type Board,
  type SortOrder,
} from "@/lib/forum";
import { listThreads, type ThreadListItem } from "@/lib/queries";
import { loadBook, type BookView } from "@/lib/portfolio";
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
  handle: string | null;
  name: string | null;
  image: string | null;
  admin: boolean;
  book: BookView;
};

export async function loadForumShell(search: {
  board?: string;
  order?: string;
}): Promise<ForumShellData> {
  const board = parseBoard(search.board);
  const order = parseOrder(search.order);
  const [threads, session, book] = await Promise.all([
    listThreads({ board, order }),
    getForumSession(),
    loadBook(),
  ]);
  return {
    board,
    order,
    threads,
    signedIn: Boolean(session?.user),
    canPost: session?.user.kind === "human",
    viewerId: session?.user.id ?? null,
    handle: session?.user.handle ?? null,
    name: session?.user.name ?? null,
    image: session?.user.image ?? null,
    admin: isAdminEmail(session?.user.email),
    book,
  };
}

const listCol =
  "min-h-0 w-full min-w-0 flex-col border-r border-border bg-card md:w-72 lg:w-80 xl:w-96";

function ForumFooter({
  className,
  copyright,
  disclaimer,
}: {
  className?: string;
  copyright: string;
  disclaimer: string;
}) {
  return (
    <footer className={className}>
      <p>{copyright}</p>
      <p className="mt-1">{disclaimer}</p>
    </footer>
  );
}

export async function ForumShell({
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
  const { dict } = await getMessages();
  const { board, order, threads, signedIn, handle, name, image, admin, book } = data;

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
              className="shrink-0 font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              {dict.brand}
            </Link>
            <div className="min-w-0 flex-1" />
            {signedIn ? (
              <Link
                href={newThreadHref(board, order)}
                aria-label={dict.nav.newThread}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-accent transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <IconPlus className="h-5 w-5" />
              </Link>
            ) : null}
            {signedIn ? (
              <UserMenu handle={handle} name={name} image={image} admin={admin} />
            ) : (
              <SignInLink className="cursor-pointer px-2 text-sm font-medium transition-colors duration-200 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                {dict.nav.signIn}
              </SignInLink>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <p className="min-w-0 truncate text-sm font-medium">
              {board ? dict.boards[board] : dict.boards.all}
            </p>
            <div className="min-w-0 flex-1" />
            <LocaleToggle />
          </div>
          <nav className="flex gap-4 px-3" aria-label={dict.nav.sort}>
            <Link
              href={listHref(board, "latest")}
              className={
                order === "latest"
                  ? `${tabClass} border-accent font-semibold text-foreground`
                  : `${tabClass} border-transparent text-muted hover:text-foreground`
              }
            >
              {dict.nav.latest}
            </Link>
            <Link
              href={listHref(board, "hot")}
              className={
                order === "hot"
                  ? `${tabClass} border-accent font-semibold text-foreground`
                  : `${tabClass} border-transparent text-muted hover:text-foreground`
              }
            >
              {dict.nav.hot}
            </Link>
          </nav>
          <BookStrip book={book} />
        </div>
        <div className="forum-scroll min-h-0 flex-1 overflow-y-auto">
          <ThreadList
            threads={threads}
            board={board}
            order={order}
            activeId={activeId}
            signedIn={signedIn}
          />
        </div>
        <ForumFooter
          className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted md:hidden"
          copyright={dict.footer.copyright}
          disclaimer={dict.footer.disclaimer}
        />
      </aside>
      <section
        className={
          pane === "list"
            ? "hidden min-h-0 min-w-0 flex-1 flex-col md:flex"
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        <div className="forum-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
          {children}
        </div>
        <ForumFooter
          className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted"
          copyright={dict.footer.copyright}
          disclaimer={dict.footer.disclaimer}
        />
      </section>
    </div>
  );
}
