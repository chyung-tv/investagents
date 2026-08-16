"use client";

import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/app/login/actions";
import { IconClose } from "@/components/icons";
import { isAuthMode, safeNextPath, stripAuthParam } from "@/lib/auth-href";
import { useDict } from "@/i18n/locale-provider";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useMemo, useRef } from "react";

const fieldClass =
  "w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
const primaryBtn =
  "cursor-pointer rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60";
const secondaryBtn =
  "w-full cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-background disabled:opacity-60";

export function SignInLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { dict } = useDict();
  return (
    <Suspense
      fallback={
        <span className={className}>{children ?? dict.nav.signIn}</span>
      }
    >
      <SignInLinkInner className={className}>{children}</SignInLinkInner>
    </Suspense>
  );
}

function SignInLinkInner({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { dict } = useDict();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("auth", "signin");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  return (
    <Link href={href} scroll={false} className={className}>
        {children ?? dict.nav.signIn}
    </Link>
  );
}

export function AuthModal() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useDict();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mode = searchParams.get("auth");
  const open = isAuthMode(mode);

  const stayOn = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const next = searchParams.get("next")
    ? stripAuthParam(safeNextPath(searchParams.get("next")))
    : stayOn;
  const signupHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("auth", "signup");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);
  const signinHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("auth", "signin");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  function close() {
    router.replace(stayOn, { scroll: false });
  }

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[90vh] w-[min(100%-2rem,24rem)] overflow-y-auto rounded-lg border border-border bg-card p-5 text-foreground shadow-lg backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="auth-dialog-title" className="text-lg font-semibold tracking-tight">
            {mode === "signup" ? dict.auth.createAccount : dict.auth.signIn}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "signup"
              ? dict.auth.signUpHint
              : dict.auth.signInHint}
          </p>
        </div>
        <button
          type="button"
          aria-label={dict.auth.close}
          onClick={close}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
      {mode === "signup" ? (
        <SignUpFields next={next} signinHref={signinHref} />
      ) : (
        <SignInFields next={next} signupHref={signupHref} />
      )}
    </dialog>
  );
}

function SignInFields({
  next,
  signupHref,
}: {
  next: string;
  signupHref: string;
}) {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithGoogle,
    null,
  );
  const { dict } = useDict();

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          {dict.auth.email}
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict.auth.password}
          <input
            name="password"
            type="password"
            required
            className={fieldClass}
          />
        </label>
        {state?.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? dict.auth.signingIn : dict.auth.signIn}
        </button>
      </form>
      <form action={googleAction}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          disabled={googlePending}
          className={secondaryBtn}
        >
          {googlePending ? dict.auth.redirecting : dict.auth.google}
        </button>
      </form>
      {googleState?.error ? (
        <p role="alert" className="text-sm text-red-600">
          {googleState.error}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        {dict.auth.noAccount}{" "}
        <Link
          href={signupHref}
          scroll={false}
          className="cursor-pointer underline"
        >
          {dict.auth.signUp}
        </Link>
      </p>
    </div>
  );
}

function SignUpFields({
  next,
  signinHref,
}: {
  next: string;
  signinHref: string;
}) {
  const [state, formAction, pending] = useActionState(signUpWithEmail, null);
  const { dict } = useDict();

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          {dict.auth.name}
          <input name="name" type="text" required className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict.auth.email}
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict.auth.password}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={fieldClass}
          />
        </label>
        {state?.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? dict.auth.creating : dict.auth.createAccount}
        </button>
      </form>
      <p className="text-sm text-muted">
        {dict.auth.alreadyHere}{" "}
        <Link
          href={signinHref}
          scroll={false}
          className="cursor-pointer underline"
        >
          {dict.auth.signIn}
        </Link>
      </p>
    </div>
  );
}
