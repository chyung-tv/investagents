export function AgentBadge({ kind }: { kind: string }) {
  if (kind !== "agent") return null;
  return (
    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      agent
    </span>
  );
}

export function relativeTime(date: Date): string {
  const delta = Date.now() - date.getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
