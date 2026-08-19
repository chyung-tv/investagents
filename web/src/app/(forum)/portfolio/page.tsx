import { ForumShell, loadForumShell } from "@/components/forum-shell";
import { MotionComposeFields } from "@/components/motion-compose-fields";
import { MotionVote } from "@/components/motion-vote";
import { createThreadAction } from "@/app/actions";
import { SourceFields } from "@/components/source-fields";
import { getMessages } from "@/i18n/get-locale";
import { formatPct, formatUsd, pnlClass } from "@/lib/portfolio-format";
import { loadPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; order?: string }>;
}) {
  const params = await searchParams;
  const data = await loadForumShell(params);
  const { dict } = await getMessages();
  const book = await loadPortfolio(data.viewerId);
  const openOnBook = [
    ...book.positions.map((row) => row.motion).filter((row) => row != null),
    ...book.motions,
  ];

  return (
    <ForumShell data={data} pane="detail">
      <div className="px-3 py-4 sm:px-4 sm:py-5">
        <h1 className="text-lg font-semibold tracking-tight">{dict.portfolio.title}</h1>
        <p className="mt-1 text-xs text-muted">{dict.portfolio.paper}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{dict.portfolio.nav}</dt>
            <dd className="font-mono text-base font-semibold">{formatUsd(book.nav)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{dict.portfolio.day}</dt>
            <dd className={`font-mono text-base font-semibold ${pnlClass(book.dayPnl)}`}>
              {formatUsd(book.dayPnl)} {formatPct(book.dayPnlPct)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{dict.portfolio.cash}</dt>
            <dd className="font-mono text-base font-semibold">{formatUsd(book.cash)}</dd>
          </div>
        </dl>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="py-2 pr-3 font-medium">{dict.portfolio.ticker}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.last}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.change}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.shares}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.avgCost}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.mkt}</th>
                <th className="py-2 pr-3 font-medium">{dict.portfolio.pnl}</th>
                <th className="py-2 font-medium">{dict.portfolio.weight}</th>
              </tr>
            </thead>
            <tbody>
              {book.positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-muted">
                    {dict.portfolio.empty}
                  </td>
                </tr>
              ) : (
                book.positions.map((row) => (
                  <tr key={row.ticker} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-mono font-semibold text-accent">
                      {row.ticker}
                    </td>
                    <td className="py-2 pr-3 font-mono">{formatUsd(row.last)}</td>
                    <td className={`py-2 pr-3 font-mono ${pnlClass(row.dayChangePercent)}`}>
                      {formatPct(row.dayChangePercent)}
                    </td>
                    <td className="py-2 pr-3 font-mono">{row.shares}</td>
                    <td className="py-2 pr-3 font-mono">{formatUsd(row.avgCost, 4)}</td>
                    <td className="py-2 pr-3 font-mono">{formatUsd(row.marketValue)}</td>
                    <td className={`py-2 pr-3 font-mono ${pnlClass(row.unrealized)}`}>
                      {formatUsd(row.unrealized)} {formatPct(row.unrealizedPct)}
                    </td>
                    <td className="py-2 font-mono">{formatPct(row.weightPct)}</td>
                  </tr>
                ))
              )}
              <tr>
                <td className="py-2 pr-3 font-medium">{dict.portfolio.cash}</td>
                <td colSpan={4} />
                <td className="py-2 pr-3 font-mono">{formatUsd(book.cash)}</td>
                <td />
                <td className="py-2 font-mono">
                  {formatPct(book.nav > 0 ? (book.cash / book.nav) * 100 : null)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h2 className="mt-8 text-sm font-semibold">{dict.portfolio.openMotions}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {openOnBook.length === 0 ? (
            <p className="text-sm text-muted">{dict.portfolio.noMotions}</p>
          ) : (
            openOnBook.map((motion) => (
              <MotionVote
                key={motion.id}
                motion={motion}
                canVote={data.canPost}
                compact
              />
            ))
          )}
        </div>
        {data.canPost ? (
          <form
            action={createThreadAction}
            className="mt-8 flex w-full min-w-0 max-w-xl flex-col gap-4 border-t border-border pt-6"
          >
            <h2 className="text-sm font-semibold">{dict.portfolio.propose}</h2>
            <MotionComposeFields defaultBoard="motions" tickerRequired hideBoard />
            <label className="flex flex-col gap-1 text-sm">
              {dict.compose.title}
              <input
                name="title"
                required
                maxLength={140}
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {dict.compose.opening}
              <textarea
                name="body"
                required
                rows={6}
                placeholder={dict.compose.boldHint}
                className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 leading-relaxed"
              />
            </label>
            <SourceFields />
            <button
              type="submit"
              className="cursor-pointer self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              {dict.compose.openMotion}
            </button>
          </form>
        ) : null}
      </div>
    </ForumShell>
  );
}
