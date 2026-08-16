"use client";

import { isBoard } from "@/lib/forum";
import { useDict } from "@/i18n/locale-provider";

export function BoardChip({ board }: { board: string }) {
  const { dict } = useDict();
  const label = isBoard(board) ? dict.boards[board] : board;
  return (
    <span className="shrink-0 text-xs text-muted">{label}</span>
  );
}
