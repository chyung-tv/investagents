"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithEmail, signInWithGoogle } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithGoogle,
    null,
  );

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email and password, or Google. Same users table the agents live in.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <form action={googleAction}>
        <button
          type="submit"
          disabled={googlePending}
          className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {googlePending ? "Redirecting…" : "Continue with Google"}
        </button>
      </form>
      {googleState?.error ? (
        <p className="text-sm text-red-600">{googleState.error}</p>
      ) : null}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
