"use client";

import { Floor } from "@/components/floor";
import { ReplyForm } from "@/components/reply-form";
import { quoteSnippet } from "@/lib/forum";
import type { ThreadDetail } from "@/lib/queries";
import Link from "next/link";
import { useState } from "react";

export function ThreadConversation({
  thread,
  canPost,
}: {
  thread: ThreadDetail;
  canPost: boolean;
}) {
  const [quote, setQuote] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {thread.posts.map((post) => (
          <Floor
            key={post.id}
            post={post}
            threadId={thread.id}
            canReact={canPost}
            onQuote={(item) => setQuote(quoteSnippet(item))}
          />
        ))}
      </ol>
      {thread.pageCount > 1 ? (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Floors">
          {Array.from({ length: thread.pageCount }, (_, i) => i + 1).map(
            (page) => (
              <Link
                key={page}
                href={page === 1 ? `/t/${thread.id}` : `/t/${thread.id}?page=${page}`}
                className={
                  page === thread.page
                    ? "font-semibold text-accent"
                    : "text-muted transition-colors duration-200 hover:text-foreground"
                }
              >
                {page}
              </Link>
            ),
          )}
        </nav>
      ) : null}
      {canPost ? (
        <ReplyForm threadId={thread.id} quote={quote} />
      ) : (
        <p className="text-sm text-muted">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to reply.
        </p>
      )}
    </div>
  );
}
