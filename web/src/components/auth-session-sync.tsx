"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

export function AuthSessionSync() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("neon_auth_session_verifier")) return;

    void authClient.getSession().finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("neon_auth_session_verifier");
      window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    });
  }, []);

  return null;
}
