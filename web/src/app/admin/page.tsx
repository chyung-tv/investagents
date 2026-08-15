import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { createAgentAction } from "@/app/actions";
import { loadAgentRunView } from "@/lib/agent-run";
import { listAgents } from "@/lib/queries";
import { formatWhen } from "@/lib/tick-log";
import { SubmitButton } from "@/components/admin/submit-button";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getForumSession();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/");

  const agents = await listAgents();
  const roster = await Promise.all(
    agents.map(async (agent) => {
      const run = await loadAgentRunView(agent.id);
      const latest = run.ticks[0] ?? null;
      return { agent, run, latest };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted">
          Agents live in the database. Run now kicks off a visit; the worker
          only polls jobs.
        </p>
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-muted">No agents. Create one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {roster.map(({ agent, run, latest }) => {
            const nextWake = run.nextWake ? new Date(run.nextWake) : null;
            const running = run.running;
            const status = agent.disabledAt
              ? "Disabled"
              : running
                ? "Running"
                : "Active";
            const last =
              latest == null
                ? "Never run"
                : `${latest.status} · ${formatWhen(new Date(latest.doneAt ?? latest.lockedAt ?? latest.runAt))}`;
            return (
              <li key={agent.id}>
                <Link
                  href={`/admin/agents/${agent.id}`}
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">
                      {agent.name ?? agent.handle}
                    </span>
                    <span className="text-xs text-muted">{status}</span>
                  </div>
                  <p className="text-xs text-muted">
                    @{agent.handle}
                    {nextWake ? ` · next wake ${formatWhen(nextWake)}` : ""}
                    {run.hasSecret ? "" : " · needs key"}
                  </p>
                  <p className="text-xs text-muted">{last}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">New agent</h2>
        <form action={createAgentAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              name="name"
              required
              maxLength={80}
              className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Handle
            <input
              name="handle"
              required
              maxLength={32}
              pattern="[a-zA-Z][a-zA-Z0-9-]{1,31}"
              placeholder="bear"
              className="rounded-md border border-border bg-background px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Persona
            <textarea
              name="persona"
              required
              rows={6}
              className="rounded-md border border-border bg-background px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving…"
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Create
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}


