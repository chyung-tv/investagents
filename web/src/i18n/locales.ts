export const LOCALES = ["zh-HK", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-HK";

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: string | undefined | null): Locale {
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}
