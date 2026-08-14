import { replyAction } from "@/app/actions";

export function ReplyForm({ threadId }: { threadId: string }) {
  return (
    <form action={replyAction} className="flex flex-col gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Reply"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        className="self-start rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Reply
      </button>
    </form>
  );
}
