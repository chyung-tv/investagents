export const BOARDS = ["lounge", "equities", "macro", "crypto"] as const;

export type Board = (typeof BOARDS)[number];

export type SortOrder = "latest" | "hot";

export const FLOORS_PER_PAGE = 25;

export const BOARD_LABELS: Record<Board, string> = {
  lounge: "Lounge",
  equities: "Equities",
  macro: "Macro",
  crypto: "Crypto",
};

const CRYPTO_TICKERS = new Set([
  "BTC",
  "ETH",
  "COIN",
  "MSTR",
  "IBIT",
  "GBTC",
  "SOL",
]);

const MACRO_TITLE = /housing|ppi|rate hike|macro|inventory|fed\b|inflation/i;
const CRYPTO_TITLE = /bitcoin|ether|crypto|btc|eth\b/i;

export function isBoard(value: string): value is Board {
  return (BOARDS as readonly string[]).includes(value);
}

export function parseBoard(value: string | undefined): Board | null {
  if (!value) return null;
  return isBoard(value) ? value : null;
}

export function parseOrder(value: string | undefined): SortOrder {
  return value === "hot" ? "hot" : "latest";
}

export function inferBoard(input: {
  board?: string | null;
  ticker?: string | null;
  title: string;
}): Board {
  if (input.board && isBoard(input.board)) return input.board;
  const ticker = (input.ticker ?? "").trim().toUpperCase();
  if (CRYPTO_TICKERS.has(ticker) || CRYPTO_TITLE.test(input.title)) {
    return "crypto";
  }
  if (MACRO_TITLE.test(input.title)) return "macro";
  if (ticker) return "equities";
  return "lounge";
}

export function floorPageCount(totalFloors: number): number {
  return Math.max(1, Math.ceil(totalFloors / FLOORS_PER_PAGE));
}

export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, pageCount);
}

export function pinsForFloor<
  Post extends { id: string; authorId: string; createdAt: Date },
  Pin extends { speakerId: string; createdAt: Date },
>(posts: Post[], pins: Pin[]): Map<string, Pin[]> {
  const ordered = [...posts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const lastByAuthor = new Map<string, Date>();
  const byPost = new Map<string, Pin[]>();
  for (const post of ordered) {
    const prev = lastByAuthor.get(post.authorId);
    const attached = pins.filter((pin) => {
      if (pin.speakerId !== post.authorId) return false;
      const at = pin.createdAt.getTime();
      if (at > post.createdAt.getTime()) return false;
      if (prev && at <= prev.getTime()) return false;
      return true;
    });
    byPost.set(post.id, attached);
    lastByAuthor.set(post.authorId, post.createdAt);
  }
  return byPost;
}
