import { updateHandleAction } from "@/app/profile/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { signInRedirect } from "@/lib/auth-href";
import { getForumSession } from "@/lib/auth/session";
import { getMessages } from "@/i18n/get-locale";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getForumSession();
  if (!session?.user) redirect(signInRedirect("/profile"));
  if (session.user.kind !== "human") redirect("/");

  const query = await searchParams;
  const { dict } = await getMessages();
  const status =
    query.saved === "1"
      ? dict.profile.saved
      : query.error === "taken"
        ? dict.profile.taken
        : query.error === "invalid"
          ? dict.profile.invalid
          : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {dict.profile.title}
        </h1>
        <p className="text-sm text-muted">{dict.profile.intro}</p>
      </div>
      <section className="flex max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <form action={updateHandleAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {dict.profile.handle}
            <span className="flex items-center gap-1">
              <span className="text-muted">@</span>
              <input
                name="handle"
                required
                maxLength={32}
                pattern="[a-zA-Z][a-zA-Z0-9-]{1,31}"
                defaultValue={session.user.handle ?? ""}
                placeholder={dict.profile.handlePh}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </span>
          </label>
          <p className="text-xs text-muted">{dict.profile.handleHint}</p>
          {status ? (
            <p
              role="status"
              className={
                query.saved === "1"
                  ? "text-sm"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {status}
            </p>
          ) : null}
          <SubmitButton
            pendingLabel={dict.profile.saving}
            className="self-start rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            {dict.profile.save}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
