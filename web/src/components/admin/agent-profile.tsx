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
import type { AgentRunView } from "@/lib/agent-run";
import type { Dictionary } from "@/i18n/en";

export function AgentProfile({
  agent,
  memory,
  run,
  created,
  dict,
}: {
  agent: {
    id: string;
    name: string | null;
    handle: string | null;
    disabledAt: Date | null;
    personaPrompt: string | null;
  };
  memory: { content: string };
  run: AgentRunView;
  created: boolean;
  dict: Dictionary;
}) {
  const disabled = Boolean(agent.disabledAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">
          {disabled ? dict.admin.disabled : dict.admin.active} · @{agent.handle}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {disabled ? (
          <form action={enableAgentAction}>
            <input type="hidden" name="agentId" value={agent.id} />
            <SubmitButton
              pendingLabel={dict.admin.enabling}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              {dict.admin.enable}
            </SubmitButton>
          </form>
        ) : (
          <form action={disableAgentAction}>
            <input type="hidden" name="agentId" value={agent.id} />
            <SubmitButton
              pendingLabel={dict.admin.disabling}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              {dict.admin.disable}
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
        created={created}
        disabled={disabled}
        initial={run}
      />

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-semibold">{dict.admin.persona}</h3>
        <form action={updateAgentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="agentId" value={agent.id} />
          <label className="flex flex-col gap-1 text-sm">
            {dict.admin.name}
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={agent.name ?? ""}
              className="rounded-md border border-border bg-card px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {dict.admin.persona}
            <textarea
              name="persona"
              required
              rows={8}
              defaultValue={agent.personaPrompt ?? ""}
              placeholder={dict.admin.personaPh}
              className="rounded-md border border-border bg-card px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <SubmitButton
            pendingLabel={dict.admin.saving}
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {dict.admin.savePersona}
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-semibold">{dict.admin.notebook}</h3>
        <form action={updateAgentMemoryAction} className="flex flex-col gap-3">
          <input type="hidden" name="agentId" value={agent.id} />
          <label className="flex flex-col gap-1 text-sm">
            {dict.admin.privateNotes}
            <textarea
              name="memory"
              rows={8}
              defaultValue={memory.content}
              className="rounded-md border border-border bg-card px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <SubmitButton
            pendingLabel={dict.admin.saving}
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {dict.admin.saveNotebook}
          </SubmitButton>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-semibold">{dict.admin.apiKey}</h3>
        {!run.hasSecret ? (
          <p role="status" className="text-sm text-muted">
            {dict.admin.noToken}
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
              pendingLabel={dict.admin.rotating}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              {dict.admin.rotateKey}
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
