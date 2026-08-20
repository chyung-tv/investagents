"use client";

import { useDict } from "@/i18n/locale-provider";
import { BOARDS, type Board } from "@/lib/forum";
import { useState } from "react";

export function MotionComposeFields({
  defaultBoard,
}: {
  defaultBoard: Board;
}) {
  const { dict } = useDict();
  const [board, setBoard] = useState<Board>(defaultBoard);
  const [side, setSide] = useState("");

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        {dict.compose.board}
        <select
          name="board"
          required
          value={board}
          onChange={(event) => setBoard(event.target.value as Board)}
          className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
        >
          {BOARDS.map((slug) => (
            <option key={slug} value={slug}>
              {dict.boards[slug]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {dict.compose.ticker}
        <input
          name="ticker"
          maxLength={8}
          placeholder="NVDA"
          className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 font-mono uppercase"
        />
      </label>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="text-muted">{dict.compose.motionOptional}</legend>
        <label className="flex flex-col gap-1">
          {dict.compose.side}
          <select
            name="motionSide"
            value={side}
            onChange={(event) => setSide(event.target.value)}
            className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
          >
            <option value="">{dict.compose.motionNone}</option>
            <option value="buy">{dict.book.buy}</option>
            <option value="sell">{dict.book.sell}</option>
          </select>
        </label>
        {side ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              {dict.compose.qty}
              <input
                name="motionShares"
                type="number"
                min={1}
                step={1}
                required
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              {dict.compose.price}
              <input
                name="motionPrice"
                type="number"
                min={0.01}
                step="0.01"
                required
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
          </div>
        ) : null}
      </fieldset>
    </>
  );
}
