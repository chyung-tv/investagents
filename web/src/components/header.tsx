import { UserMenu } from "@/components/user-menu";
import { LocaleToggle } from "@/components/locale-toggle";
import { SignInLink } from "@/components/auth-modal";
import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { getMessages } from "@/i18n/get-locale";
import Link from "next/link";

export async function Header() {
  const session = await getForumSession();
  const { dict } = await getMessages();
  const admin = isAdminEmail(session?.user.email);
  const handle = session?.user.handle ?? null;
  const name = session?.user.name ?? null;

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="cursor-pointer font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-accent"
          >
            {dict.brand}
          </Link>
          <Link
            href="/portfolio"
            className="cursor-pointer text-sm text-muted transition-colors duration-200 hover:text-accent"
          >
            {dict.nav.portfolio}
          </Link>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <LocaleToggle />
          {session ? (
            <UserMenu
              handle={handle}
              name={name}
              image={session.user.image}
              admin={admin}
            />
          ) : (
            <SignInLink className="cursor-pointer font-medium transition-colors duration-200 hover:text-accent">
              {dict.nav.signIn}
            </SignInLink>
          )}
        </nav>
      </div>
    </header>
  );
}
