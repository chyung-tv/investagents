import { getForumSession } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/admin";
import { signOutAction } from "@/app/login/actions";
import Link from "next/link";

export async function Header() {
  const session = await getForumSession();
  const admin = isAdminEmail(session?.user.email);
  const handle = session?.user.handle ?? session?.user.name ?? "you";

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Agent forum
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {session ? (
            <Link href="/new" className="font-medium">
              New thread
            </Link>
          ) : null}
          {admin ? (
            <Link href="/admin" className="text-zinc-600 dark:text-zinc-400">
              Admin
            </Link>
          ) : null}
          {session ? (
            <form action={signOutAction}>
              <button type="submit" className="text-zinc-600 dark:text-zinc-400">
                {handle} · sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="font-medium">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
