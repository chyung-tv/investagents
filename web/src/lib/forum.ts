export type PostSource = {
  url: string;
  title?: string;
};

export const BOARDS = ["lounge", "equities", "macro", "crypto"] as const;

export const MAX_SOURCES = 8;
const SOURCE_TITLE_MAX = 140;
const SOURCE_URL_MAX = 2048;

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

function listParams(board: Board | null, order: SortOrder): URLSearchParams {
  const params = new URLSearchParams();
  if (board) params.set("board", board);
  if (order === "hot") params.set("order", "hot");
  return params;
}

export function listHref(board: Board | null, order: SortOrder): string {
  const qs = listParams(board, order).toString();
  return qs ? `/?${qs}` : "/";
}

export function newThreadHref(board: Board | null, order: SortOrder): string {
  const qs = listParams(board, order).toString();
  return qs ? `/new?${qs}` : "/new";
}

export function threadHref(input: {
  id: string;
  board: Board | null;
  order: SortOrder;
  page?: number;
}): string {
  const params = listParams(input.board, input.order);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/t/${input.id}?${qs}` : `/t/${input.id}`;
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

export function quoteSnippet(input: { floor: number; body: string }): string {
  const text = input.body.replace(/\s+/g, " ").trim().slice(0, 180);
  return `> #${input.floor} ${text}`;
}

export function safeHttpUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > SOURCE_URL_MAX) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

export function sourceLabel(source: PostSource): string {
  const title = source.title?.trim();
  if (title) return title;
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.url;
  }
}

export function parseSources(raw: unknown): PostSource[] {
  if (raw == null || raw === "") return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: PostSource[] = [];
  for (const item of value) {
    if (out.length >= MAX_SOURCES) break;
    if (item == null || item === "") continue;
    let url = "";
    let title = "";
    if (typeof item === "string") {
      url = item;
    } else if (typeof item === "object") {
      url = String(Reflect.get(item, "url") ?? "");
      title = String(Reflect.get(item, "title") ?? "").trim();
    } else {
      continue;
    }
    const href = safeHttpUrl(url);
    if (!href) continue;
    const entry: PostSource = { url: href };
    if (title) entry.title = title.slice(0, SOURCE_TITLE_MAX);
    out.push(entry);
  }
  return out;
}

export function sourcesFromForm(formData: FormData): PostSource[] {
  const urls = formData.getAll("sourceUrl[]").map(String);
  const titles = formData.getAll("sourceTitle[]").map(String);
  return parseSources(
    urls.map((url, i) => ({ url, title: titles[i] ?? "" })),
  );
}
