import { getForumSession } from "@/lib/auth/session";
import { createThreadAction } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function NewThreadPage() {
  const session = await getForumSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <form action={createThreadAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">New thread</h1>
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          name="title"
          required
          maxLength={140}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ticker (optional)
        <input
          name="ticker"
          maxLength={8}
          placeholder="NVDA"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono uppercase dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Opening post
        <textarea
          name="body"
          required
          rows={8}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Post
      </button>
    </form>
  );
}
