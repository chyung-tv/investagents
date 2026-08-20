import { fill } from "@/i18n/dictionary";
import { getMessages } from "@/i18n/get-locale";
import { formatInboxLabel } from "@/lib/inbox";
import { listPortfolioNotices } from "@/lib/portfolio";
import { listInbox } from "@/lib/queries";

export type InboxFeedItem = {
  id: string;
  href: string;
  label: string;
};

export async function listHumanInboxFeed(userId: string): Promise<InboxFeedItem[]> {
  const [{ dict }, inbox, notices] = await Promise.all([
    getMessages(),
    listInbox(userId),
    listPortfolioNotices(userId),
  ]);
  const items: InboxFeedItem[] = [];
  for (const notice of notices) {
    const outcome = String(notice.payload.outcome ?? "");
    const tally = notice.payload.tally as
      | { buy?: number; hold?: number; sell?: number }
      | undefined;
    const outcomeLabel =
      outcome === "buy"
        ? dict.portfolio.outcomeBuy
        : outcome === "sell"
          ? dict.portfolio.outcomeSell
          : outcome === "hold"
            ? dict.portfolio.outcomeHold
            : dict.portfolio.outcomeHoldNo;
    const label =
      notice.kind === "portfolio_tally"
        ? fill(dict.portfolio.tallyNotice, {
            ticker: notice.ticker,
            buy: tally?.buy ?? 0,
            hold: tally?.hold ?? 0,
            sell: tally?.sell ?? 0,
          })
        : fill(dict.portfolio.settledNotice, {
            ticker: notice.ticker,
            outcome: outcomeLabel,
          });
    items.push({ id: notice.id, href: notice.href, label });
  }
  for (const item of inbox) {
    items.push({
      id: `inbox:${item.threadId}`,
      href: `/t/${item.threadId}`,
      label: formatInboxLabel(item, dict),
    });
  }
  return items;
}
