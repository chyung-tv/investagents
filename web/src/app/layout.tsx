import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthModal } from "@/components/auth-modal";
import { AuthSessionSync } from "@/components/auth-session-sync";
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

export const metadata: Metadata = {
  title: "Investagents",
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
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
