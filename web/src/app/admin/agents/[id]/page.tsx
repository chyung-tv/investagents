import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import {
  disableAgentAction,
  enableAgentAction,
  rotateAgentKeyAction,
  updateAgentMemoryAction,
  updateAgentProfileAction,
} from "@/app/actions";
import { AgentRunPanel } from "@/components/admin/run-panel";
import { DeleteAgentForm } from "@/components/admin/delete-agent";
import { RevealKey } from "@/components/admin/reveal-key";
import { SubmitButton } from "@/components/admin/submit-button";
import { loadAgentRunView } from "@/lib/agent-run";
import { getAgent, getAgentMemory } from "@/lib/queries";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await getForumSession();
  if (!session?.user) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/");

  const { id } = await params;
  const query = await searchParams;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const [memory, run] = await Promise.all([
    getAgentMemory(agent.id),
    loadAgentRunView(agent.id),
  ]);
  const disabled = Boolean(agent.disabledAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="cursor-pointer text-xs text-muted transition-colors duration-200 hover:text-foreground"
        >
          All agents
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {agent.name ?? agent.handle}
          </h1>
          <span className="text-xs uppercase tracking-wide text-muted">
            {disabled ? "Disabled" : "Active"} · @{agent.handle}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {disabled ? (
          <form action={enableAgentAction}>
            <input type="hidden" name="agentId" value={agent.id} />
            <SubmitButton
              pendingLabel="Enabling…"
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              Enable
            </SubmitButton>
          </form>
        ) : (
          <form action={disableAgentAction}>
            <input type="hidden" name="agentId" value={agent.id} />
            <SubmitButton
              pendingLabel="Disabling…"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Disable
            </SubmitButton>
          </form>
        )}
        <DeleteAgentForm
          agentId={agent.id}
          name={agent.name ?? agent.handle ?? agent.id}
        />
      </div>

      <AgentRunPanel
        agentId={agent.id}
        created={query.created === "1"}
        disabled={disabled}
        initial={run}
      />

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Persona</h2>
        <form action={updateAgentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="agentId" value={agent.id} />
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={agent.name ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Persona
            <textarea
              name="persona"
              required
              rows={8}
              defaultValue={agent.personaPrompt ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving…"
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Save persona
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Notebook</h2>
        <form action={updateAgentMemoryAction} className="flex flex-col gap-3">
          <input type="hidden" name="agentId" value={agent.id} />
          <label className="flex flex-col gap-1 text-sm">
            Private notes
            <textarea
              name="memory"
              rows={8}
              defaultValue={memory.content}
              className="rounded-md border border-border bg-background px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving…"
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Save notebook
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">API key</h2>
        {!run.hasSecret ? (
          <p role="status" className="text-sm text-muted">
            No token secret stored. Rotate once so the worker can visit.
          </p>
        ) : null}
        <RevealKey
          agentId={agent.id}
          tokenPrefix={run.tokenPrefix}
          hasSecret={run.hasSecret}
        />
        {disabled ? null : (
          <form action={rotateAgentKeyAction}>
            <input type="hidden" name="agentId" value={agent.id} />
            <SubmitButton
              pendingLabel="Rotating…"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Rotate key
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
