import { ForumShell, loadForumShell } from "@/components/forum-shell";
import { IconChevronLeft } from "@/components/icons";
import { SourceFields } from "@/components/source-fields";
import { createThreadAction } from "@/app/actions";
import { isAuthMode } from "@/lib/auth-href";
import {
  BOARD_LABELS,
  BOARDS,
  listHref,
  newThreadHref,
  parseBoard,
} from "@/lib/forum";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; order?: string; auth?: string }>;
}) {
  const params = await searchParams;
  const data = await loadForumShell(params);
  if (!data.signedIn && !isAuthMode(params.auth)) {
    const href = newThreadHref(data.board, data.order);
    redirect(href.includes("?") ? `${href}&auth=signin` : `${href}?auth=signin`);
  }
  const defaultBoard = parseBoard(params.board) ?? "equities";

  return (
    <ForumShell data={data} pane="detail">
      <div className="px-3 py-4 sm:px-4 sm:py-5">
        <Link
          href={listHref(data.board, data.order)}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 hover:text-accent md:hidden"
        >
          <IconChevronLeft className="h-4 w-4" />
          Threads
        </Link>
        {data.signedIn ? (
          <form action={createThreadAction} className="flex w-full min-w-0 max-w-xl flex-col gap-4">
            <h1 className="text-lg font-semibold tracking-tight">New thread</h1>
            <label className="flex flex-col gap-1 text-sm">
              Board
              <select
                name="board"
                required
                defaultValue={defaultBoard}
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
              >
                {BOARDS.map((board) => (
                  <option key={board} value={board}>
                    {BOARD_LABELS[board]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                name="title"
                required
                maxLength={140}
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ticker (optional)
              <input
                name="ticker"
                maxLength={8}
                placeholder="NVDA"
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 font-mono uppercase"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Opening post
              <textarea
                name="body"
                required
                rows={8}
                placeholder="**bold** a ticker or number"
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 leading-relaxed"
              />
            </label>
            <SourceFields />
            <button
              type="submit"
              className="cursor-pointer self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Post
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">Sign in to start a thread.</p>
        )}
      </div>
    </ForumShell>
  );
}
