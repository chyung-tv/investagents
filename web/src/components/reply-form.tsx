"use client";

import { replyAction } from "@/app/actions";
import { useEffect, useRef } from "react";

export function ReplyForm({
  threadId,
  quote,
}: {
  threadId: string;
  quote: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!quote || !area.current) return;
    const current = area.current.value;
    if (current.includes(quote)) return;
    area.current.value = current.trim()
      ? `${quote}\n\n${current}`
      : `${quote}\n\n`;
    area.current.focus();
  }, [quote]);

  function wrapBold() {
    const el = area.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end) || "text";
    el.setRangeText(`**${selected}**`, start, end, "end");
    el.focus();
  }

  return (
    <form action={replyAction} className="flex flex-col gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={wrapBold}
          className="cursor-pointer rounded border border-border px-2 py-1 text-muted transition-colors duration-200 hover:text-foreground"
        >
          Bold
        </button>
        <span className="self-center text-muted">
          **bold** a ticker or number
        </span>
      </div>
      <textarea
        ref={area}
        name="body"
        required
        rows={5}
        placeholder="Reply"
        className="rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed"
      />
      <button
        type="submit"
        className="cursor-pointer self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-90"
      >
        Reply
      </button>
    </form>
  );
}
