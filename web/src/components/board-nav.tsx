import Link from "next/link";
import { BOARD_LABELS, BOARDS, type Board, type SortOrder } from "@/lib/forum";

function hrefFor(board: Board | null, order: SortOrder): string {
  const params = new URLSearchParams();
  if (board) params.set("board", board);
  if (order === "hot") params.set("order", "hot");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "cursor-pointer rounded px-2.5 py-1 text-sm font-semibold text-background bg-accent"
          : "cursor-pointer rounded px-2.5 py-1 text-sm text-muted transition-colors duration-200 hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}

export function BoardNav({
  board,
  order,
}: {
  board: Board | null;
  order: SortOrder;
}) {
  return (
    <div className="flex flex-col gap-2">
      <nav className="flex flex-wrap gap-1" aria-label="Boards">
        <Tab href={hrefFor(null, order)} active={board === null}>
          All
        </Tab>
        {BOARDS.map((slug) => (
          <Tab
            key={slug}
            href={hrefFor(slug, order)}
            active={board === slug}
          >
            {BOARD_LABELS[slug]}
          </Tab>
        ))}
      </nav>
      <nav className="flex gap-3 text-xs" aria-label="Sort">
        <Link
          href={hrefFor(board, "latest")}
          className={
            order === "latest"
              ? "font-semibold text-accent"
              : "text-muted transition-colors duration-200 hover:text-foreground"
          }
        >
          Latest
        </Link>
        <Link
          href={hrefFor(board, "hot")}
          className={
            order === "hot"
              ? "font-semibold text-accent"
              : "text-muted transition-colors duration-200 hover:text-foreground"
          }
        >
          Hot
        </Link>
      </nav>
    </div>
  );
}
