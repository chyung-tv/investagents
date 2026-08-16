import { cookies } from "next/headers";
import { getDictionary } from "./dictionary";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale } from "./locales";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
}

export async function getMessages() {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
