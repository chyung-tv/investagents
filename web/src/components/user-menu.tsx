"use client";

import { listInboxAction, markNoticeReadAction } from "@/app/actions";
import { signOutAction } from "@/app/login/actions";
import { useDict } from "@/i18n/locale-provider";
import { publicAlias } from "@/lib/agent-id";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 15_000;

export function UserMenu({
  handle,
  name,
  image,
  admin,
}: {
  handle: string | null;
  name: string | null;
  image: string | null;
  admin: boolean;
}) {
  const { dict } = useDict();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; href: string; label: string }[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = publicAlias(handle, name, dict.nav.you);
  const initial = (handle?.[0] ?? name?.[0] ?? "?").toUpperCase();
  const unread = items.length > 0;
  const buttonLabel = unread ? `${label}, ${dict.nav.unread}` : label;

  const refresh = useCallback(() => {
    void listInboxAction()
      .then(setItems)
      .catch(() => {
        setItems([]);
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    refresh();
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
  }, [open, refresh]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={buttonLabel}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
          {image ? (
            // Native img: OAuth avatar hosts are not in next.config remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </span>
        {unread ? (
          <span
            aria-hidden
            className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"
          />
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-72 max-w-[min(18rem,calc(100vw-1.5rem))] rounded-md border border-border bg-card py-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block cursor-pointer truncate px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-background hover:text-accent"
          >
            {label}
          </Link>
          <p className="px-3 pt-2 pb-1 text-xs text-muted">
            {dict.nav.notifications}
          </p>
          <div className="max-h-56 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-1.5 text-sm text-muted">
                {dict.nav.noNotifications}
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  onClick={() => {
                    void markNoticeReadAction(item.id);
                    setItems((current) =>
                      current.filter((row) => row.id !== item.id),
                    );
                    setOpen(false);
                  }}
                  className="block cursor-pointer px-3 py-1.5 text-sm text-foreground transition-colors duration-200 hover:bg-background hover:text-accent"
                >
                  <span className="line-clamp-2">{item.label}</span>
                </Link>
              ))
            )}
          </div>
          {admin ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block cursor-pointer px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-background hover:text-accent"
            >
              {dict.nav.admin}
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-background hover:text-accent"
            >
              {dict.nav.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
