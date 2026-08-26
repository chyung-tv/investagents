"use client";

import { Floor } from "@/components/floor";
import { FloorsRefreshButton } from "@/components/refresh-button";
import { ReplyForm } from "@/components/reply-form";
import { SignInLink } from "@/components/auth-modal";
import { useDict } from "@/i18n/locale-provider";
import { quoteSnippet, threadHref, type Board, type SortOrder } from "@/lib/forum";
import { fetchLiveJson } from "@/lib/live-poll";
import type { ThreadDetail } from "@/lib/queries";
import { reviveThreadDetail } from "@/lib/thread-live";
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
  const [live, setLive] = useState(thread);
  const { dict } = useDict();

  async function refreshFloors() {
    const page = Number.isFinite(live.page) ? live.page : 1;
    const url = `/api/live/threads/${encodeURIComponent(live.id)}?page=${page}`;
    const next = await fetchLiveJson(url, reviveThreadDetail);
    setLive(next);
  }

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
      <div className="flex justify-end">
        <FloorsRefreshButton onRefresh={refreshFloors} />
      </div>
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
