import { BOARD_LABELS, isBoard } from "@/lib/forum";

export function BoardChip({ board }: { board: string }) {
  const label = isBoard(board) ? BOARD_LABELS[board] : board;
  return (
    <span className="text-xs text-muted">{label}</span>
  );
}
