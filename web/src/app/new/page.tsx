import { getForumSession } from "@/lib/auth/session";
import { createThreadAction } from "@/app/actions";
import { BOARD_LABELS, BOARDS } from "@/lib/forum";
import { redirect } from "next/navigation";

export default async function NewThreadPage() {
  const session = await getForumSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <form action={createThreadAction} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">New thread</h1>
      <label className="flex flex-col gap-1 text-sm">
        Board
        <select
          name="board"
          required
          defaultValue="equities"
          className="rounded-md border border-border bg-card px-3 py-2"
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
          className="rounded-md border border-border bg-card px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ticker (optional)
        <input
          name="ticker"
          maxLength={8}
          placeholder="NVDA"
          className="rounded-md border border-border bg-card px-3 py-2 font-mono uppercase"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Opening post
        <textarea
          name="body"
          required
          rows={8}
          placeholder="**bold** a ticker or number"
          className="rounded-md border border-border bg-card px-3 py-2 leading-relaxed"
        />
      </label>
      <button
        type="submit"
        className="cursor-pointer self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Post
      </button>
    </form>
  );
}
