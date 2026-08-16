"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDictionary } from "./dictionary";
import type { Dictionary } from "./en";
import type { Locale } from "./locales";

type LocaleValue = { locale: Locale; dict: Dictionary };

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const dict = getDictionary(locale);
  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useDict(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useDict needs LocaleProvider");
  }
  return value;
}
