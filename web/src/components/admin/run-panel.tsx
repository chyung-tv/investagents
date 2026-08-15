"use client";

import { loadAgentRunViewAction, runAgentNowAction } from "@/app/actions";
import type { AgentRunView, RunTickDto } from "@/lib/agent-run";
import { PIPELINE_STEPS, formatWhen } from "@/lib/tick-log";
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
  const [view, setView] = useState(initial);
  useEffect(() => {
    setView(initial);
  }, [initial]);

  const inflight = view.ticks.some((tick) => !tick.doneAt);
  useEffect(() => {
    if (!inflight) return;
    const id = setInterval(() => {
      void loadAgentRunViewAction(agentId).then(setView);
    }, 4000);
    return () => clearInterval(id);
  }, [agentId, inflight]);

  const latest = view.ticks[0] ?? null;
  const neverRun = view.ticks.length === 0;
  const nextWake = view.nextWake ? new Date(view.nextWake) : null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Run</h2>
          <p className="text-xs text-muted">
            {nextWake
              ? `Next wake ${formatWhen(nextWake)}`
              : neverRun
                ? "Never run"
                : "No scheduled wake"}
          </p>
        </div>
        <form action={runAgentNowAction}>
          <input type="hidden" name="agentId" value={agentId} />
          <SubmitButton
            pendingLabel="Queuing…"
            disabled={disabled || !view.hasSecret}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Run now
          </SubmitButton>
        </form>
      </div>
      {created && neverRun ? (
        <p
          role="status"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          Saved. This agent will not visit until you Run now.
        </p>
      ) : null}
      {!view.hasSecret ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          No visit key yet. Rotate the API key before running.
        </p>
      ) : null}
      {disabled ? (
        <p className="text-sm text-muted">Disabled. Enable before running.</p>
      ) : null}
      {latest ? <Stepper tick={latest} /> : null}
      {neverRun ? (
        <p className="text-xs text-muted">No ticks yet.</p>
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

function Stepper({ tick }: { tick: RunTickDto }) {
  const current = tick.stage;
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-muted">
      {PIPELINE_STEPS.map((step, index) => {
        const active = current === step;
        const failed = current === "failed";
        return (
          <li
            key={step}
            className={
              active
                ? "font-semibold text-foreground"
                : failed
                  ? "text-red-600 dark:text-red-400"
                  : ""
            }
            aria-current={active ? "step" : undefined}
          >
            {index > 0 ? <span className="mr-2 text-border">/</span> : null}
            {step}
          </li>
        );
      })}
      {current === "failed" ? (
        <li className="font-semibold text-red-600 dark:text-red-400" aria-current="step">
          <span className="mr-2 text-border">/</span>
          failed
        </li>
      ) : null}
    </ol>
  );
}

function TickEntry({ tick }: { tick: RunTickDto }) {
  const stamp = new Date(tick.doneAt ?? tick.lockedAt ?? tick.runAt);
  const error = tick.stage === "failed" || Boolean(tick.error);
  return (
    <li className="border-t border-border pt-3">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs text-muted" title={stamp.toISOString()}>
            {tick.source} · {formatWhen(stamp)}
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
          <p className="mt-1 text-xs text-muted">No events recorded.</p>
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
                    {formatWhen(new Date(event.at))}
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
                    <summary className="cursor-pointer">Detail</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                      {event.lines.join("\n")}
                    </pre>
                  </details>
                ) : null}
                {event.extra ? (
                  <details className="mt-0.5">
                    <summary className="cursor-pointer">Raw detail</summary>
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
