"use client";

import { signOutAction } from "@/app/login/actions";
import { useDict } from "@/i18n/locale-provider";
import { publicAlias } from "@/lib/agent-id";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const label = publicAlias(handle, name, dict.nav.you);
  const initial = (handle?.[0] ?? name?.[0] ?? "?").toUpperCase();

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors duration-200 hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
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
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-44 rounded-md border border-border bg-card py-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block cursor-pointer truncate px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-background hover:text-accent"
          >
            {label}
          </Link>
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
