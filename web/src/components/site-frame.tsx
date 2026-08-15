import { Header } from "@/components/header";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-4 sm:px-4 sm:py-5">
        {children}
      </main>
    </div>
  );
}
