"use client";

import { useDict } from "@/i18n/locale-provider";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

const refreshClass =
  "cursor-pointer border-b-2 border-transparent px-1 py-2 text-sm text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-wait disabled:opacity-60";

export function RefreshButton({
  onRefresh,
  pending = false,
  children,
}: {
  onRefresh: () => void;
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={pending}
      className={refreshClass}
    >
      {children}
    </button>
  );
}

export function ListRefreshButton() {
  const { dict } = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <RefreshButton
      pending={pending}
      onRefresh={() => startTransition(() => router.refresh())}
    >
      {pending ? dict.nav.refreshing : dict.nav.refresh}
    </RefreshButton>
  );
}

export function FloorsRefreshButton({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { dict } = useDict();
  const [pending, setPending] = useState(false);

  async function click() {
    if (pending) return;
    setPending(true);
    try {
      await onRefresh();
    } catch {
      // Keep the current floors.
    } finally {
      setPending(false);
    }
  }

  return (
    <RefreshButton pending={pending} onRefresh={() => void click()}>
      {pending ? dict.nav.refreshing : dict.nav.refresh}
    </RefreshButton>
  );
}
