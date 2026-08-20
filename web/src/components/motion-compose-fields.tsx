"use client";

import { useDict } from "@/i18n/locale-provider";
import { BOARDS, type Board } from "@/lib/forum";
import { useState } from "react";

export function MotionComposeFields({
  defaultBoard,
  tickerRequired = false,
  hideBoard = false,
}: {
  defaultBoard: Board;
  tickerRequired?: boolean;
  hideBoard?: boolean;
}) {
  const { dict } = useDict();
  const [board, setBoard] = useState<Board>(defaultBoard);
  const motion = hideBoard || board === "motions" || tickerRequired;
  const [choice, setChoice] = useState<"buy" | "hold" | "sell">("buy");

  return (
    <>
      {hideBoard ? (
        <input type="hidden" name="board" value={defaultBoard} />
      ) : (
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
      )}
      <label className="flex flex-col gap-1 text-sm">
        {motion ? dict.compose.tickerRequired : dict.compose.ticker}
        <input
          name="ticker"
          required={motion}
          maxLength={8}
          placeholder="NVDA"
          className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 font-mono uppercase"
        />
      </label>
      {motion ? (
        <>
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="mb-1 text-sm">{dict.compose.side}</legend>
            {(["buy", "hold", "sell"] as const).map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-1">
                <input
                  type="radio"
                  name="choice"
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                  className="accent-accent"
                />
                {dict.compose[value]}
              </label>
            ))}
          </fieldset>
          {choice === "buy" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                {dict.compose.qty}
                <input
                  name="qty"
                  type="number"
                  min={1}
                  step={1}
                  required
                  defaultValue={1}
                  className="rounded-md border border-border bg-card px-3 py-2 font-mono"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                {dict.compose.limit}
                <input
                  name="limit"
                  type="number"
                  min={0.0001}
                  step="0.01"
                  required
                  className="rounded-md border border-border bg-card px-3 py-2 font-mono"
                />
              </label>
            </div>
          ) : null}
          {choice === "sell" ? (
            <label className="flex max-w-xs flex-col gap-1 text-sm">
              {dict.compose.qty}
              <input
                name="qty"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={1}
                className="rounded-md border border-border bg-card px-3 py-2 font-mono"
              />
            </label>
          ) : null}
        </>
      ) : null}
    </>
  );
}
