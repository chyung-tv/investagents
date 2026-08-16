"use client";

import { IconClose } from "@/components/icons";
import { adminHref } from "@/lib/admin-href";
import { useDict } from "@/i18n/locale-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export function AdminDrawer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { dict } = useDict();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") router.replace(adminHref());
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [router]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <Link
        href={adminHref()}
        replace
        scroll={false}
        aria-label={dict.auth.close}
        className="absolute inset-0 cursor-pointer bg-black/50"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="forum-drawer-right absolute inset-y-0 right-0 flex h-dvh w-full max-w-xl flex-col border-l border-border bg-card"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
          <Link
            href={adminHref()}
            replace
            scroll={false}
            aria-label={dict.auth.close}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <IconClose className="h-4 w-4" />
          </Link>
        </div>
        <div className="forum-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
