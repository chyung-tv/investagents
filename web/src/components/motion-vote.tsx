"use client";

import { voteMotionAction } from "@/app/actions";
import { SignInLink } from "@/components/auth-modal";
import { useDict } from "@/i18n/locale-provider";
import { fill } from "@/i18n/dictionary";
import { LIMIT_INPUT_ATTRS } from "@/lib/limit-input";
import { formatQty, formatUsd } from "@/lib/portfolio-format";
import type { MotionBallot } from "@/lib/portfolio";
import { formatWhen } from "@/lib/tick-log";
import Link from "next/link";
import { useState } from "react";

function outcomeLabel(
  outcome: string | null,
  dict: ReturnType<typeof useDict>["dict"],
): string {
  if (outcome === "buy") return dict.portfolio.outcomeBuy;
  if (outcome === "sell") return dict.portfolio.outcomeSell;
  if (outcome === "hold") return dict.portfolio.outcomeHold;
  if (outcome === "hold_no_quorum") return dict.portfolio.outcomeHoldNo;
  return outcome ?? "";
}

export function MotionVote({
  motion,
  canVote,
  compact = false,
}: {
  motion: MotionBallot;
  canVote: boolean;
  compact?: boolean;
}) {
  const { dict, locale } = useDict();
  const [choice, setChoice] = useState(motion.myChoice ?? "buy");
  const total = motion.counts.buy + motion.counts.hold + motion.counts.sell;
  const closeAt = new Date(motion.closeAt);
  const open = motion.status === "open";
  const clock = motion.extendedAt
    ? fill(dict.portfolio.extended, {
        when: formatWhen(closeAt, Date.now(), locale),
      })
    : fill(dict.portfolio.closes, {
        when: formatWhen(closeAt, Date.now(), locale),
      });

  const bar = (n: number) =>
    total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;

  return (
    <section className="rounded-md border border-border bg-card px-3 py-3 text-sm">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-mono font-semibold text-accent">{motion.ticker}</p>
        {open ? (
          <p className="text-xs text-muted">{clock}</p>
        ) : (
          <p className="text-xs text-muted">
            {fill(dict.portfolio.settled, {
              outcome: outcomeLabel(motion.outcome, dict),
            })}
            {motion.fillQty != null && motion.fillPrice != null
              ? ` · ${fill(dict.portfolio.filled, {
                  qty: String(motion.fillQty),
                  price: formatUsd(motion.fillPrice),
                })}`
              : ` · ${dict.portfolio.noFill}`}
          </p>
        )}
        {compact ? (
          <Link
            href={`/t/${motion.threadId}`}
            className="ml-auto text-xs text-accent transition-colors duration-200 hover:text-foreground"
          >
            {dict.portfolio.thread}
          </Link>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted">{motion.threadTitle}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <p>
          {dict.portfolio.buy} {motion.counts.buy} · {bar(motion.counts.buy)}
        </p>
        <p>
          {dict.portfolio.hold} {motion.counts.hold} · {bar(motion.counts.hold)}
        </p>
        <p>
          {dict.portfolio.sell} {motion.counts.sell} · {bar(motion.counts.sell)}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        {dict.portfolio.running}: {dict.portfolio.buy}{" "}
        {formatQty(motion.runningBuyQty)} @ {formatUsd(motion.runningBuyLimit)} ·{" "}
        {dict.portfolio.sell} {formatQty(motion.runningSellQty)}
      </p>
      {open && canVote ? (
        <form action={voteMotionAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="motionId" value={motion.id} />
          <fieldset className="flex flex-wrap gap-3">
            <legend className="sr-only">{dict.portfolio.vote}</legend>
            {(["buy", "hold", "sell"] as const).map((value) => {
              if (value === "sell" && !motion.canSell) return null;
              return (
                <label key={value} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="choice"
                    value={value}
                    checked={choice === value}
                    onChange={() => setChoice(value)}
                    className="accent-accent"
                  />
                  {dict.portfolio[value]}
                </label>
              );
            })}
          </fieldset>
          {choice === "buy" ? (
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                {dict.portfolio.qty}
                <input
                  name="qty"
                  type="number"
                  min={1}
                  step={1}
                  required
                  defaultValue={motion.myQty ?? 1}
                  className="rounded-md border border-border bg-background px-2 py-1 font-mono"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                {dict.portfolio.limit}
                <input
                  {...LIMIT_INPUT_ATTRS}
                  defaultValue={motion.myLimit ?? ""}
                  className="rounded-md border border-border bg-background px-2 py-1 font-mono"
                />
              </label>
            </div>
          ) : null}
          {choice === "sell" ? (
            <label className="flex max-w-xs flex-col gap-1 text-xs">
              {dict.portfolio.qty}
              <input
                name="qty"
                type="number"
                min={1}
                max={motion.sharesHeld}
                step={1}
                required
                defaultValue={motion.myQty ?? motion.sharesHeld}
                className="rounded-md border border-border bg-background px-2 py-1 font-mono"
              />
            </label>
          ) : null}
          <button
            type="submit"
            className="cursor-pointer self-start rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors duration-200 hover:bg-accent"
          >
            {dict.portfolio.vote}
          </button>
        </form>
      ) : null}
      {open && !canVote ? (
        <p className="mt-2 text-xs text-muted">
          <SignInLink className="cursor-pointer text-accent hover:text-foreground">
            {dict.nav.signIn}
          </SignInLink>{" "}
          {dict.portfolio.signInToVote}
        </p>
      ) : null}
      {!open && motion.ballots && motion.ballots.length > 0 ? (
        <ul className="mt-3 border-t border-border pt-2 text-xs">
          <li className="mb-1 text-muted">{dict.portfolio.roll}</li>
          {motion.ballots.map((row) => (
            <li key={row.userId} className="flex flex-wrap gap-x-2 font-mono">
              <span>{row.handle}</span>
              <span>{dict.portfolio[row.choice]}</span>
              {row.choice !== "hold" ? (
                <span>
                  {formatQty(row.qty)}
                  {row.limit != null ? ` @ ${formatUsd(row.limit)}` : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
