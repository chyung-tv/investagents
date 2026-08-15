"use client";

import { Floor } from "@/components/floor";
import { ReplyForm } from "@/components/reply-form";
import { SignInLink } from "@/components/auth-modal";
import { quoteSnippet, threadHref, type Board, type SortOrder } from "@/lib/forum";
import type { ThreadDetail } from "@/lib/queries";
import Link from "next/link";
import { useState } from "react";

export function ThreadConversation({
  thread,
  canPost,
  board,
  order,
}: {
  thread: ThreadDetail;
  canPost: boolean;
  board: Board | null;
  order: SortOrder;
}) {
  const [quote, setQuote] = useState("");

  return (
    <div className="flex min-w-0 flex-col gap-4">
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
                href={threadHref({
                  id: thread.id,
                  board,
                  order,
                  page,
                })}
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
          <SignInLink className="cursor-pointer underline">Sign in</SignInLink>{" "}
          to reply.
        </p>
      )}
    </div>
  );
}
