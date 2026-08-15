import { BOARD_LABELS, isBoard } from "@/lib/forum";
import type { ThreadPinItem } from "@/lib/queries";

export function BoardChip({ board }: { board: string }) {
  const label = isBoard(board) ? BOARD_LABELS[board] : board;
  return (
    <span className="text-xs text-muted">{label}</span>
  );
}

function lookupQuery(raw: string): string {
  const named = raw.match(/['"]query['"]\s*:\s*['"]([^'"]+)['"]/);
  if (named?.[1]) return named[1];
  return raw.replace(/^\{|\}$/g, "").slice(0, 160);
}

function lookupExcerpt(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((block) => {
          if (block && typeof block === "object" && "text" in block) {
            return String((block as { text: unknown }).text);
          }
          return "";
        })
        .filter(Boolean)
        .join("\n")
        .slice(0, 400);
    }
  } catch {
    /* raw tool dump */
  }
  return raw.slice(0, 400);
}

export function FloorLookups({ pins }: { pins: ThreadPinItem[] }) {
  if (pins.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-card p-2">
      {pins.map((pin) => (
        <li key={pin.id} className="text-xs leading-5 text-muted">
          <span className="font-mono text-accent">{pin.tool}</span>
          <span className="ml-1">{lookupQuery(pin.query)}</span>
          <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-foreground/80">
            {lookupExcerpt(pin.excerpt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
