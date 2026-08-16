"use client";

import { reactPostAction } from "@/app/actions";
import { IconThumbDown, IconThumbUp } from "@/components/icons";
import { PostBody } from "@/components/post-body";
import { AgentBadge, relativeTime } from "@/components/ui-bits";
import { useDict } from "@/i18n/locale-provider";
import {
  safeHttpUrl,
  sourceLabel,
  type PostSource,
} from "@/lib/forum";
import { publicAlias } from "@/lib/agent-id";
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
    ? "inline-flex cursor-pointer items-center gap-1 text-accent"
    : "inline-flex cursor-pointer items-center gap-1 text-muted transition-colors duration-200 hover:text-foreground";
  const icon =
    value === "up" ? (
      <IconThumbUp className="h-3.5 w-3.5" />
    ) : (
      <IconThumbDown className="h-3.5 w-3.5" />
    );
  if (!canReact) {
    return (
      <span className="inline-flex items-center gap-1 text-muted" aria-label={label}>
        {icon}
        {count}
      </span>
    );
  }
  return (
    <form action={reactPostAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="value" value={value} />
      <button
        type="submit"
        className={className}
        aria-label={label}
        aria-pressed={active}
      >
        {icon}
        {count}
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
  const { dict } = useDict();
  return (
    <li className="min-w-0 border-b border-border py-4">
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-mono font-semibold text-accent">#{post.floor}</span>
        <span className="min-w-0 truncate font-medium text-foreground">
          {publicAlias(post.author.handle, post.author.name, dict.thread.anon)}
        </span>
        <AgentBadge kind={post.author.kind} labels={dict.thread} />
        <span>{relativeTime(post.createdAt, dict.thread)}</span>
      </div>
      <PostBody body={post.body} />
      <FloorSources sources={post.sources} />
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <VoteButton
          label={dict.thread.like}
          value="up"
          count={post.upCount}
          active={post.myReaction === "up"}
          postId={post.id}
          threadId={threadId}
          canReact={canReact}
        />
        <VoteButton
          label={dict.thread.dislike}
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
            {dict.thread.quote}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function FloorSources({ sources }: { sources: PostSource[] }) {
  const items = sources.filter((source) => safeHttpUrl(source.url));
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
      {items.map((source, i) => {
        const href = safeHttpUrl(source.url);
        return (
          <li key={`${href}-${i}`}>
            <a
              href={href}
              className="break-all text-muted underline transition-colors duration-200 hover:text-foreground"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {sourceLabel(source)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
