"use client";

import { revealAgentKeyAction } from "@/app/actions";
import { useDict } from "@/i18n/locale-provider";
import { useState } from "react";

export function RevealKey({
  agentId,
  tokenPrefix,
  hasSecret,
}: {
  agentId: string;
  tokenPrefix: string | null;
  hasSecret: boolean;
}) {
  const { dict } = useDict();
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setError(null);
    try {
      setSecret(await revealAgentKeyAction(agentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.revealFailed);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-muted">
        {secret ?? (tokenPrefix ? `${tokenPrefix}…` : dict.admin.noActiveKey)}
      </p>
      {hasSecret ? (
        <button
          type="button"
          onClick={() => {
            if (secret) {
              setSecret(null);
              return;
            }
            void reveal();
          }}
          className="cursor-pointer self-start text-xs text-accent transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {secret ? dict.admin.hide : dict.admin.reveal}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
