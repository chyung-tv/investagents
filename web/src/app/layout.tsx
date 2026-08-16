import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthModal } from "@/components/auth-modal";
import { AuthSessionSync } from "@/components/auth-session-sync";
import { getDictionary } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/get-locale";
import { LocaleProvider } from "@/i18n/locale-provider";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <LocaleProvider locale={locale}>
          <AuthSessionSync />
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
