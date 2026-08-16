import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { loadAgentRunView } from "@/lib/agent-run";
import { adminHref } from "@/lib/admin-href";
import { getAgent, getAgentMemory, listAgents } from "@/lib/queries";
import { signInRedirect } from "@/lib/auth-href";
import { fill } from "@/i18n/dictionary";
import { getMessages } from "@/i18n/get-locale";
import { formatWhen } from "@/lib/tick-log";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AgentProfile } from "@/components/admin/agent-profile";
import { NewAgentForm } from "@/components/admin/new-agent-form";
import { IconPlus } from "@/components/icons";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; created?: string; new?: string }>;
}) {
  const session = await getForumSession();
  if (!session?.user) redirect(signInRedirect("/admin"));
  if (!isAdminEmail(session.user.email)) redirect("/");

  const query = await searchParams;
  const { locale, dict } = await getMessages();
  const agents = await listAgents();
  const roster = await Promise.all(
    agents.map(async (agent) => {
      const run = await loadAgentRunView(agent.id);
      const latest = run.ticks[0] ?? null;
      return { agent, run, latest };
    }),
  );

  const newAgent = query.new === "1";
  const selectedId = newAgent ? "" : (query.agent ?? "").trim();
  const panelAgent = selectedId ? await getAgent(selectedId) : null;
  const [panelMemory, panelRun] = panelAgent
    ? await Promise.all([
        getAgentMemory(panelAgent.id),
        loadAgentRunView(panelAgent.id),
      ])
    : [null, null];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {dict.admin.title}
          </h1>
          <Link
            href={adminHref({ newAgent: true })}
            scroll={false}
            aria-label={dict.admin.newAgent}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-accent transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
        </div>
        <p className="text-sm text-muted">{dict.admin.intro}</p>
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-muted">{dict.admin.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {roster.map(({ agent, run, latest }) => {
            const nextWake = run.nextWake ? new Date(run.nextWake) : null;
            const running = run.running;
            const status = agent.disabledAt
              ? dict.admin.disabled
              : running
                ? dict.admin.running
                : dict.admin.active;
            const last =
              latest == null
                ? dict.admin.neverRun
                : `${latest.status} · ${formatWhen(new Date(latest.doneAt ?? latest.lockedAt ?? latest.runAt), Date.now(), locale)}`;
            const selected = agent.id === selectedId;
            return (
              <li key={agent.id}>
                <Link
                  href={adminHref({ agent: agent.id })}
                  scroll={false}
                  aria-current={selected ? "page" : undefined}
                  className={
                    selected
                      ? "flex cursor-pointer flex-col gap-1 rounded-lg border border-accent bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      : "flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  }
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {agent.name ?? agent.handle}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{status}</span>
                  </div>
                  <p className="text-xs text-muted">
                    @{agent.handle}
                    {nextWake
                      ? ` · ${fill(dict.admin.nextWake, { when: formatWhen(nextWake, Date.now(), locale) })}`
                      : ""}
                    {run.hasSecret ? "" : ` · ${dict.admin.needsKey}`}
                  </p>
                  <p className="text-xs text-muted">{last}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {newAgent ? (
        <AdminDrawer title={dict.admin.newAgent}>
          <NewAgentForm dict={dict} />
        </AdminDrawer>
      ) : panelAgent && panelMemory && panelRun ? (
        <AdminDrawer title={panelAgent.name ?? panelAgent.handle ?? panelAgent.id}>
          <AgentProfile
            agent={panelAgent}
            memory={panelMemory}
            run={panelRun}
            created={query.created === "1"}
            dict={dict}
          />
        </AdminDrawer>
      ) : null}
    </div>
  );
}
