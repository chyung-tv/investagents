"use client";

import { deleteAgentAction } from "@/app/actions";
import { fill } from "@/i18n/dictionary";
import { useDict } from "@/i18n/locale-provider";
import { SubmitButton } from "./submit-button";

export function DeleteAgentForm({
  agentId,
  name,
}: {
  agentId: string;
  name: string;
}) {
  const { dict } = useDict();
  return (
    <form
      action={deleteAgentAction}
      onSubmit={(event) => {
        const ok = window.confirm(fill(dict.admin.deleteConfirm, { name }));
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="agentId" value={agentId} />
      <SubmitButton
        pendingLabel={dict.admin.deleting}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
      >
        {dict.admin.delete}
      </SubmitButton>
    </form>
  );
}
