import { formatUsd } from "@/lib/portfolio-format";
import type { BookView } from "@/lib/portfolio";
import { getMessages } from "@/i18n/get-locale";
import Link from "next/link";

export async function BookStrip({ book }: { book: BookView }) {
  const { dict } = await getMessages();
  const holdings = book.holdings.slice(0, 8);
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-x-auto px-3 py-1.5 text-xs text-muted">
      <span className="shrink-0 font-medium text-foreground">
        {dict.book.cash} {formatUsd(book.cash, 0)}
      </span>
      {holdings.length === 0 ? (
        <span className="shrink-0">{dict.book.empty}</span>
      ) : (
        holdings.map((row) => (
          <span key={row.ticker} className="shrink-0 font-mono">
            {row.ticker} {row.shares}
          </span>
        ))
      )}
      {book.openMotions[0] ? (
        <Link
          href={`/t/${book.openMotions[0].threadId}`}
          className="shrink-0 cursor-pointer hover:text-foreground"
        >
          {book.openMotions[0].ticker} {book.openMotions[0].yes}/{book.openMotions[0].threshold}
        </Link>
      ) : null}
    </div>
  );
}
