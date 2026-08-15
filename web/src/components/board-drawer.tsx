"use client";

import { IconMenu } from "@/components/icons";
import {
  BOARD_LABELS,
  BOARDS,
  listHref,
  type Board,
  type SortOrder,
} from "@/lib/forum";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function BoardDrawer({
  board,
  order,
}: {
  board: Board | null;
  order: SortOrder;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const rooms: { slug: Board | null; label: string }[] = [
    { slug: null, label: "All" },
    ...BOARDS.map((slug) => ({ slug, label: BOARD_LABELS[slug] })),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="board-drawer"
        aria-label="Boards"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <IconMenu className="h-5 w-5" />
      </button>
      {open ? (
        <nav
          id="board-drawer"
          aria-label="Boards"
          className="absolute top-full left-0 z-30 mt-1 min-w-40 rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {rooms.map((room) => {
            const active = room.slug === board;
            return (
              <Link
                key={room.label}
                href={listHref(room.slug, order)}
                onClick={() => setOpen(false)}
                className={
                  active
                    ? "block cursor-pointer px-3 py-1.5 text-sm font-semibold text-accent"
                    : "block cursor-pointer px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-background hover:text-foreground"
                }
              >
                {room.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
