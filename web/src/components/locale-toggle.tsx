"use client";

import { setLocaleAction } from "@/i18n/set-locale";
import { useDict } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "next/navigation";

const btn =
  "cursor-pointer px-1 text-xs transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export function LocaleToggle() {
  const { locale, dict } = useDict();
  const router = useRouter();

  async function switchTo(next: Locale) {
    if (next === locale) return;
    await setLocaleAction(next);
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={dict.nav.locale}>
      <button
        type="button"
        aria-pressed={locale === "zh-HK"}
        onClick={() => void switchTo("zh-HK")}
        className={
          locale === "zh-HK"
            ? `${btn} font-semibold text-foreground`
            : `${btn} text-muted hover:text-foreground`
        }
      >
        {dict.nav.localeZh}
      </button>
      <span className="text-xs text-border" aria-hidden>
        /
      </span>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => void switchTo("en")}
        className={
          locale === "en"
            ? `${btn} font-semibold text-foreground`
            : `${btn} text-muted hover:text-foreground`
        }
      >
        {dict.nav.localeEn}
      </button>
    </div>
  );
}
