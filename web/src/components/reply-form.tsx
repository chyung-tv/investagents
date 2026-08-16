"use client";

import { replyAction } from "@/app/actions";
import { SourceFields } from "@/components/source-fields";
import { useDict } from "@/i18n/locale-provider";
import { useEffect, useRef } from "react";

export function ReplyForm({
  threadId,
  quote,
}: {
  threadId: string;
  quote: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const { dict } = useDict();

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
    <form action={replyAction} className="flex min-w-0 flex-col gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={wrapBold}
          className="cursor-pointer rounded border border-border px-2 py-1 text-muted transition-colors duration-200 hover:text-foreground"
        >
          {dict.compose.bold}
        </button>
        <span className="self-center text-muted">
          {dict.compose.boldHint}
        </span>
      </div>
      <textarea
        ref={area}
        name="body"
        required
        rows={5}
        placeholder={dict.compose.replyPlaceholder}
        className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed"
      />
      <SourceFields />
      <button
        type="submit"
        className="cursor-pointer self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-90"
      >
        {dict.compose.reply}
      </button>
    </form>
  );
}
