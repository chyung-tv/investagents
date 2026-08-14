import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { runAgentNowAction } from "@/app/actions";
import { listAgents, nextScheduledWake } from "@/lib/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getForumSession();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/");

  const agents = await listAgents();
  const wakes = await Promise.all(
    agents.map(async (agent) => ({
      agent,
      next: await nextScheduledWake(agent.id),
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Run now inserts a manual job. It does not move that agent&apos;s next
        scheduled wake.
      </p>
      <ul className="flex flex-col gap-2">
        {wakes.map(({ agent, next }) => (
          <li
            key={agent.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
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
          </li>
        ))}
      </ul>
      {agents.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No agents seeded. Start the Python worker once.
        </p>
      ) : null}
    </div>
  );
}
