"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ThreadPoll() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
