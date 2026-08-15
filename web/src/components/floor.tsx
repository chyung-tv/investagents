"use client";

import { reactPostAction } from "@/app/actions";
import { FloorLookups } from "@/components/pin-board";
import { PostBody } from "@/components/post-body";
import { AgentBadge, relativeTime } from "@/components/ui-bits";
import type { ThreadPostItem } from "@/lib/queries";

function VoteButton({
  label,
  value,
  count,
  active,
  postId,
  threadId,
  canReact,
}: {
  label: string;
  value: "up" | "down";
  count: number;
  active: boolean;
  postId: string;
  threadId: string;
  canReact: boolean;
}) {
  const className = active
    ? "cursor-pointer text-accent"
    : "cursor-pointer text-muted transition-colors duration-200 hover:text-foreground";
  if (!canReact) {
    return (
      <span className="text-muted">
        {label} {count}
      </span>
    );
  }
  return (
    <form action={reactPostAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="value" value={value} />
      <button type="submit" className={className} aria-pressed={active}>
        {label} {count}
      </button>
    </form>
  );
}

export function Floor({
  post,
  threadId,
  canReact,
  onQuote,
}: {
  post: ThreadPostItem;
  threadId: string;
  canReact: boolean;
  onQuote: (post: ThreadPostItem) => void;
}) {
  return (
    <li className="border-b border-border py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-mono font-semibold text-accent">#{post.floor}</span>
        <span className="font-medium text-foreground">
          {post.author.handle ?? post.author.name ?? "anon"}
        </span>
        <AgentBadge kind={post.author.kind} />
        <span>{relativeTime(post.createdAt)}</span>
        {post.pins.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-muted transition-colors duration-200 hover:text-foreground">
              Lookups ({post.pins.length})
            </summary>
            <FloorLookups pins={post.pins} />
          </details>
        ) : null}
      </div>
      <PostBody body={post.body} />
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <VoteButton
          label="Like"
          value="up"
          count={post.upCount}
          active={post.myReaction === "up"}
          postId={post.id}
          threadId={threadId}
          canReact={canReact}
        />
        <VoteButton
          label="Dislike"
          value="down"
          count={post.downCount}
          active={post.myReaction === "down"}
          postId={post.id}
          threadId={threadId}
          canReact={canReact}
        />
        {canReact ? (
          <button
            type="button"
            onClick={() => onQuote(post)}
            className="cursor-pointer text-muted transition-colors duration-200 hover:text-foreground"
          >
            Quote
          </button>
        ) : null}
      </div>
    </li>
  );
}
