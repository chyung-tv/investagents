"use client";

import { IconClose, IconMenu } from "@/components/icons";
import { useDict } from "@/i18n/locale-provider";
import {
  BOARDS,
  listHref,
  type Board,
  type SortOrder,
} from "@/lib/forum";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function BoardDrawer({
  board,
  order,
}: {
  board: Board | null;
  order: SortOrder;
}) {
  const { dict } = useDict();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rooms: { slug: Board | null; label: string }[] = [
    { slug: null, label: dict.boards.all },
    ...BOARDS.map((slug) => ({ slug, label: dict.boards[slug] })),
  ];

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="board-drawer"
        aria-label={dict.nav.boards}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <IconMenu className="h-5 w-5" />
      </button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                aria-label={dict.auth.close}
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-pointer bg-black/50"
              />
              <nav
                id="board-drawer"
                aria-label={dict.nav.boards}
                className="forum-drawer absolute inset-y-0 left-0 flex h-dvh w-64 flex-col border-r border-border bg-card"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-sm font-semibold">{dict.nav.boards}</span>
                  <button
                    type="button"
                    aria-label={dict.auth.close}
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                </div>
                <div className="forum-scroll min-h-0 flex-1 overflow-y-auto py-2">
                  {rooms.map((room) => {
                    const active = room.slug === board;
                    return (
                      <Link
                        key={room.slug ?? "all"}
                        href={listHref(room.slug, order)}
                        onClick={() => setOpen(false)}
                        className={
                          active
                            ? "block cursor-pointer px-4 py-3 text-sm font-semibold text-accent"
                            : "block cursor-pointer px-4 py-3 text-sm text-muted transition-colors duration-200 hover:bg-background hover:text-foreground"
                        }
                      >
                        {room.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
