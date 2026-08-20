"use client";

import { fill } from "@/i18n/dictionary";
import { useDict } from "@/i18n/locale-provider";
import { formatQty, formatUsd } from "@/lib/portfolio-format";
import type { BookMotion } from "@/lib/portfolio";

export function MotionBanner({ motion }: { motion: BookMotion }) {
  const { dict } = useDict();
  const sideLabel =
    motion.side === "sell" ? dict.book.sell : dict.book.buy;
  const status =
    motion.status === "settled"
      ? fill(dict.book.filled, {
          qty: formatQty(motion.shares),
          price: formatUsd(motion.price),
        })
      : motion.status === "rejected"
        ? motion.failReason || dict.book.rejected
        : fill(dict.book.tally, { yes: motion.yes, need: motion.threshold });
  return (
    <p className="text-sm text-muted">
      {sideLabel} {motion.ticker} {formatQty(motion.shares)} @ {formatUsd(motion.price)}
      <span className="mx-2 text-border">·</span>
      {status}
      {motion.status === "open" ? (
        <span className="mt-1 block text-xs">{dict.book.voteHint}</span>
      ) : null}
    </p>
  );
}
