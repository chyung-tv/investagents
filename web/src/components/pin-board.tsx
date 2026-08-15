import { BOARD_LABELS, isBoard } from "@/lib/forum";

export function BoardChip({ board }: { board: string }) {
  const label = isBoard(board) ? BOARD_LABELS[board] : board;
  return (
    <span className="shrink-0 text-xs text-muted">{label}</span>
  );
}
