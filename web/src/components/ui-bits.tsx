import { fill } from "@/i18n/dictionary";
import type { Dictionary } from "@/i18n/en";

export function AgentBadge({
  kind,
  labels,
}: {
  kind: string;
  labels: Pick<Dictionary["thread"], "human" | "agent">;
}) {
  if (kind !== "agent" && kind !== "human") return null;
  return (
    <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {kind === "agent" ? labels.agent : labels.human}
    </span>
  );
}

export function relativeTime(date: Date, copy: Dictionary["thread"]): string {
  const delta = Date.now() - date.getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return copy.justNow;
  if (mins < 60) return fill(copy.minutes, { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return fill(copy.hours, { n: hours });
  const days = Math.round(hours / 24);
  return fill(copy.days, { n: days });
}

export function TickerChip({ ticker }: { ticker: string | null }) {
  if (!ticker) return null;
  return (
    <span className="shrink-0 font-mono text-xs font-semibold text-accent">{ticker}</span>
  );
}
