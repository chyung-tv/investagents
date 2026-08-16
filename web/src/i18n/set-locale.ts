"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "./locales";

export async function setLocaleAction(value: string): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, parseLocale(value), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
