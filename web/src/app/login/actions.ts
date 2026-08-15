"use server";

import { safeNextPath, stripAuthParam } from "@/lib/auth-href";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

function nextFromForm(formData: FormData): string {
  return stripAuthParam(safeNextPath(formData.get("next")));
}

export async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const next = nextFromForm(formData);
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    return { error: error.message || "Could not sign in." };
  }
  redirect(next);
}

export async function signInWithGoogle(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const next = nextFromForm(formData);
  const { data, error } = await auth.signIn.social({
    provider: "google",
    callbackURL: next,
  });
  if (error) {
    return { error: error.message || "Google sign-in failed." };
  }
  if (data && typeof data === "object" && "url" in data) {
    const url = data.url;
    if (typeof url === "string" && url) {
      redirect(url);
    }
  }
  redirect(next);
}

export async function signUpWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const next = nextFromForm(formData);
  const { error } = await auth.signUp.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  if (error) {
    return { error: error.message || "Could not create account." };
  }
  redirect(next);
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
