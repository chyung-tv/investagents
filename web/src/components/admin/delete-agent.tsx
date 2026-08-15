"use client";

import { deleteAgentAction } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function DeleteAgentForm({
  agentId,
  name,
}: {
  agentId: string;
  name: string;
}) {
  return (
    <form
      action={deleteAgentAction}
      onSubmit={(event) => {
        const ok = window.confirm(
          `Delete ${name}? This removes their posts and threads they started (including other replies in those threads). Finished run logs stay. Disable instead to keep the transcript.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="agentId" value={agentId} />
      <SubmitButton
        pendingLabel="Deleting…"
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
