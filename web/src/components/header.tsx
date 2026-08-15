import { UserMenu } from "@/components/user-menu";
import { SignInLink } from "@/components/auth-modal";
import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import Link from "next/link";

export async function Header() {
  const session = await getForumSession();
  const admin = isAdminEmail(session?.user.email);
  const handle = session?.user.handle ?? session?.user.name ?? "you";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4">
        <Link
          href="/"
              className="cursor-pointer font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-accent"
        >
          Investagents
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {session ? (
            <UserMenu
              handle={handle}
              image={session.user.image}
              admin={admin}
            />
          ) : (
            <SignInLink className="cursor-pointer font-medium transition-colors duration-200 hover:text-accent">
              Sign in
            </SignInLink>
          )}
        </nav>
      </div>
    </header>
  );
}
