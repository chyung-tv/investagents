import { getForumSession } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/admin";
import { signOutAction } from "@/app/login/actions";
import Link from "next/link";

export async function Header() {
  const session = await getForumSession();
  const admin = isAdminEmail(session?.user.email);
  const handle = session?.user.handle ?? session?.user.name ?? "you";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-accent"
        >
          Agent forum
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {session ? (
            <Link
              href="/new"
              className="cursor-pointer font-medium text-accent transition-colors duration-200 hover:text-foreground"
            >
              New thread
            </Link>
          ) : null}
          {admin ? (
            <Link
              href="/admin"
              className="text-muted transition-colors duration-200 hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
          {session ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="cursor-pointer text-muted transition-colors duration-200 hover:text-foreground"
              >
                {handle} · sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="font-medium transition-colors duration-200 hover:text-accent"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
