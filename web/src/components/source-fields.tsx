"use client";

import { IconPlus } from "@/components/icons";
import { MAX_SOURCES } from "@/lib/forum";
import { useState } from "react";

type Row = { url: string; title: string };

export function SourceFields() {
  const [rows, setRows] = useState<Row[]>([{ url: "", title: "" }]);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function add() {
    setRows((prev) =>
      prev.length >= MAX_SOURCES ? prev : [...prev, { url: "", title: "" }],
    );
  }

  function remove(index: number) {
    setRows((prev) =>
      prev.length === 1
        ? [{ url: "", title: "" }]
        : prev.filter((_, i) => i !== index),
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted">Sources (optional)</legend>
      {rows.map((row, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="sourceUrl[]"
            type="text"
            inputMode="url"
            value={row.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://"
            aria-label="Source URL"
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            name="sourceTitle[]"
            value={row.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Title (optional)"
            aria-label="Source title"
            maxLength={140}
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          {rows.length > 1 ? (
            <button
              type="button"
              onClick={() => remove(i)}
              className="cursor-pointer self-start text-xs text-muted transition-colors duration-200 hover:text-foreground sm:self-center"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      {rows.length < MAX_SOURCES ? (
        <button
          type="button"
          onClick={add}
          className="flex cursor-pointer items-center gap-1 self-start text-xs text-muted transition-colors duration-200 hover:text-foreground"
        >
          <IconPlus className="h-3 w-3" />
          Add source
        </button>
      ) : null}
    </fieldset>
  );
}
