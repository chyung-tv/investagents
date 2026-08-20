"use client";

import { loadAgentRunViewAction, runAgentNowAction } from "@/app/actions";
import type { AgentRunView, RunTickDto } from "@/lib/agent-run";
import { fill } from "@/i18n/dictionary";
import { useDict } from "@/i18n/locale-provider";
import { startLivePoll } from "@/lib/live-poll";
import { formatWhen, shortJobId } from "@/lib/tick-log";
import { useEffect, useState } from "react";
import { SubmitButton } from "./submit-button";

export function AgentRunPanel({
  agentId,
  created,
  disabled,
  initial,
}: {
  agentId: string;
  created: boolean;
  disabled: boolean;
  initial: AgentRunView;
}) {
  const { locale, dict } = useDict();
  const [view, setView] = useState(initial);
  useEffect(() => {
    setView(initial);
  }, [initial]);

  const inflight = view.ticks.some((tick) => !tick.doneAt);
  useEffect(() => {
    if (!inflight) return;
    return startLivePoll(async () => {
      const next = await loadAgentRunViewAction(agentId);
      if (next) setView(next);
    }, 4000);
  }, [agentId, inflight]);

  const neverRun = view.ticks.length === 0;
  const nextWake = view.nextWake ? new Date(view.nextWake) : null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{dict.admin.run}</h2>
          <p className="text-xs text-muted">
            {nextWake
              ? fill(dict.admin.nextWakeFull, {
                  when: formatWhen(nextWake, Date.now(), locale),
                })
              : neverRun
                ? dict.admin.neverRun
                : dict.admin.noScheduledWake}
          </p>
        </div>
        <form action={runAgentNowAction}>
          <input type="hidden" name="agentId" value={agentId} />
          <SubmitButton
            pendingLabel={dict.admin.queuing}
            disabled={disabled || !view.hasSecret}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {dict.admin.runNow}
          </SubmitButton>
        </form>
      </div>
      {created && neverRun ? (
        <p
          role="status"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {dict.admin.savedRunNow}
        </p>
      ) : null}
      {!view.hasSecret ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {dict.admin.noVisitKey}
        </p>
      ) : null}
      {disabled ? (
        <p className="text-sm text-muted">{dict.admin.disabledEnable}</p>
      ) : null}
      {neverRun ? (
        <p className="text-xs text-muted">{dict.admin.noTicks}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {view.ticks.map((tick) => (
            <TickEntry key={tick.id} tick={tick} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TickEntry({ tick }: { tick: RunTickDto }) {
  const { locale, dict } = useDict();
  const stamp = new Date(tick.doneAt ?? tick.lockedAt ?? tick.runAt);
  const error = tick.stage === "failed" || Boolean(tick.error);
  return (
    <li className="border-t border-border pt-3">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs text-muted" title={stamp.toISOString()}>
            <span className="font-mono" title={tick.id}>
              {shortJobId(tick.id)}
            </span>
            {" · "}
            {tick.source} · {formatWhen(stamp, Date.now(), locale)}
          </span>
          <span
            className={
              error
                ? "text-xs text-red-600 dark:text-red-400"
                : "text-xs text-muted"
            }
          >
            {tick.status}
          </span>
        </summary>
        {tick.events.length === 0 ? (
          <p className="mt-1 text-xs text-muted">{dict.admin.noEvents}</p>
        ) : (
          <ol className="mt-1 flex flex-col gap-1 text-xs leading-snug text-muted">
            {tick.events.map((event) => (
              <li key={event.id}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={
                      event.tone === "error"
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "font-medium text-foreground"
                    }
                    role={event.tone === "error" ? "alert" : undefined}
                  >
                    {event.title}
                  </span>
                  <span className="text-[11px]" title={event.at}>
                    {formatWhen(new Date(event.at), Date.now(), locale)}
                  </span>
                </div>
                {event.links.length > 0 ? (
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {event.links.map((link) => (
                      <li key={`${event.id}-${link.href}-${link.label}`}>
                        <a
                          href={link.href}
                          className="cursor-pointer text-accent transition-colors duration-200 hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {event.lines.length > 0 ? (
                  <details className="mt-0.5">
                    <summary className="cursor-pointer">{dict.admin.detail}</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                      {event.lines.join("\n")}
                    </pre>
                  </details>
                ) : null}
                {event.extra ? (
                  <details className="mt-0.5">
                    <summary className="cursor-pointer">{dict.admin.rawDetail}</summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                      {event.extra}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </details>
    </li>
  );
}
