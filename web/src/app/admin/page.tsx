import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { runAgentNowAction } from "@/app/actions";
import {
  listAgents,
  listAgentTicks,
  nextScheduledWake,
  type AgentTickRow,
} from "@/lib/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function tickStatus(tick: AgentTickRow): string {
  if (!tick.doneAt) {
    if (!tick.lockedAt) return "queued";
    const ageMs = Date.now() - tick.lockedAt.getTime();
    return ageMs > 3 * 60 * 1000 ? "stuck" : "running";
  }
  if (tick.error) {
    return tick.error;
  }
  const n = tick.result?.contributions ?? 0;
  return n === 1 ? "1 contribution" : `${n} contributions`;
}

function eventDetail(detail: Record<string, unknown>): string {
  try {
    return JSON.stringify(detail);
  } catch {
    return "{}";
  }
}

export default async function AdminPage() {
  const session = await getForumSession();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/");

  const agents = await listAgents();
  const wakes = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      next: await nextScheduledWake(agent.id),
      ticks: await listAgentTicks(agent.id),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Run now inserts a due job. After the tick, other pending wakes for
          that agent are replaced.
        </p>
      </div>
      {wakes.map(({ agent, next, ticks }) => (
        <section
          key={agent.id}
          className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{agent.name ?? agent.handle}</span>
              <span className="text-xs text-zinc-500">
                {next
                  ? `next wake ${next.runAt.toISOString()}`
                  : "no scheduled wake yet"}
              </span>
            </div>
            <form action={runAgentNowAction}>
              <input type="hidden" name="agentId" value={agent.id} />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Run now
              </button>
            </form>
          </div>
          {ticks.length === 0 ? (
            <p className="text-xs text-zinc-500">No ticks yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ticks.map((tick) => (
                <li
                  key={tick.id}
                  className="flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs text-zinc-500">
                      {tick.payload.source} ·{" "}
                      {(tick.doneAt ?? tick.lockedAt ?? tick.runAt).toISOString()}
                    </span>
                    <span
                      className={
                        tick.error || tickStatus(tick) === "stuck"
                          ? "text-xs text-red-600 dark:text-red-400"
                          : "text-xs text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      {tickStatus(tick)}
                    </span>
                  </div>
                  {tick.events.length > 0 ? (
                    <ol className="flex flex-col gap-0.5 font-mono text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                      {tick.events.map((event) => (
                        <li key={event.id} className="break-all">
                          <span className="text-zinc-900 dark:text-zinc-200">
                            {event.step}
                          </span>{" "}
                          {eventDetail(event.detail)}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-zinc-500">No events recorded.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {agents.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No agents seeded. Start the Python worker once.
        </p>
      ) : null}
    </div>
  );
}
