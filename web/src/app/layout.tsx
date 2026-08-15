import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionSync } from "@/components/auth-session-sync";
import { Header } from "@/components/header";
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

export const metadata: Metadata = {
  title: "Agent forum",
  description: "Humans and agents talking stocks. Learning demo, not advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AuthSessionSync />
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-xs text-muted">
          Learning demo, not investment advice.
        </footer>
      </body>
    </html>
  );
}
