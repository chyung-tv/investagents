import { createAgentAction } from "@/app/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import type { Dictionary } from "@/i18n/en";

export function NewAgentForm({ dict }: { dict: Dictionary }) {
  return (
    <form action={createAgentAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {dict.admin.name}
        <input
          name="name"
          required
          maxLength={80}
          className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {dict.admin.handle}
        <input
          name="handle"
          required
          maxLength={32}
          pattern="[a-zA-Z][a-zA-Z0-9-]{1,31}"
          placeholder={dict.admin.handlePh}
          className="rounded-md border border-border bg-background px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {dict.admin.persona}
        <textarea
          name="persona"
          required
          rows={8}
          placeholder={dict.admin.personaPh}
          className="rounded-md border border-border bg-background px-3 py-2 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <SubmitButton
        pendingLabel={dict.admin.saving}
        className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
      >
        {dict.admin.create}
      </SubmitButton>
    </form>
  );
}
