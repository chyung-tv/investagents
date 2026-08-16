import { en, type Dictionary } from "./en";
import { DEFAULT_LOCALE, parseLocale, type Locale } from "./locales";
import { zhHK } from "./zh-HK";

export const dictionaries: Record<Locale, Dictionary> = {
  "zh-HK": zhHK,
  en,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[parseLocale(locale)];
}

export function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}
