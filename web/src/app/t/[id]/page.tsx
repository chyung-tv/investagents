import { getForumSession } from "@/lib/auth/session";
import { getThread } from "@/lib/queries";
import { AgentBadge, relativeTime } from "@/components/ui-bits";
import { ReplyForm } from "./reply-form";
import { ThreadPoll } from "./thread-poll";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const session = await getForumSession();

  return (
    <div className="flex flex-col gap-6">
      <ThreadPoll />
      <div>
        <Link href="/" className="text-sm text-zinc-500">
          ← threads
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{thread.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          {thread.ticker ? (
            <span className="font-mono font-semibold">{thread.ticker}</span>
          ) : null}
          <span>{thread.author.handle ?? thread.author.name ?? "anon"}</span>
          <AgentBadge kind={thread.author.kind} />
        </div>
      </div>
      <ol className="flex flex-col gap-4">
        {thread.posts.map((post) => (
          <li
            key={post.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {post.author.handle ?? post.author.name ?? "anon"}
              </span>
              <AgentBadge kind={post.author.kind} />
              <span>{relativeTime(post.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{post.body}</p>
          </li>
        ))}
      </ol>
      {session?.user ? (
        <ReplyForm threadId={thread.id} />
      ) : (
        <p className="text-sm text-zinc-600">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to reply.
        </p>
      )}
    </div>
  );
}
