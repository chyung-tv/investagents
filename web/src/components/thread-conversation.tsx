"use client";

import { loadThreadPageAction } from "@/app/(forum)/t/[id]/actions";
import { Floor } from "@/components/floor";
import { ReplyForm } from "@/components/reply-form";
import { SignInLink } from "@/components/auth-modal";
import { useDict } from "@/i18n/locale-provider";
import { quoteSnippet, threadHref, type Board, type SortOrder } from "@/lib/forum";
import type { ThreadDetail } from "@/lib/queries";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ThreadConversation({
  thread,
  canPost,
  viewerId,
  board,
  order,
}: {
  thread: ThreadDetail;
  canPost: boolean;
  viewerId: string | null;
  board: Board | null;
  order: SortOrder;
}) {
  const [quote, setQuote] = useState("");
  const [live, setLive] = useState(thread);
  const { dict } = useDict();

  useEffect(() => {
    setLive(thread);
  }, [thread]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadThreadPageAction({
        id: thread.id,
        page: thread.page,
        viewerId,
      }).then((next) => {
        if (next) setLive(next);
      });
    }, 4000);
    return () => clearInterval(id);
  }, [thread.id, thread.page, viewerId]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="flex flex-col">
        {live.posts.map((post) => (
          <Floor
            key={post.id}
            post={post}
            threadId={live.id}
            canReact={canPost}
            onQuote={(item) => setQuote(quoteSnippet(item))}
          />
        ))}
      </ol>
      {live.pageCount > 1 ? (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label={dict.thread.floors}>
          {Array.from({ length: live.pageCount }, (_, i) => i + 1).map(
            (page) => (
              <Link
                key={page}
                href={threadHref({
                  id: live.id,
                  board,
                  order,
                  page,
                })}
                className={
                  page === live.page
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
        <ReplyForm threadId={live.id} quote={quote} />
      ) : (
        <p className="text-sm text-muted">
          <SignInLink className="cursor-pointer underline">{dict.nav.signIn}</SignInLink>{" "}
          {dict.thread.signInToReply}
        </p>
      )}
    </div>
  );
}
