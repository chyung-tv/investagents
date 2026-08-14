"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    return { error: error.message || "Could not sign in." };
  }
  redirect("/");
}

export async function signInWithGoogle(
  _prev: { error: string } | null,
) {
  const { data, error } = await auth.signIn.social({
    provider: "google",
    callbackURL: "/",
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
  redirect("/");
}

export async function signUpWithEmail(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const { error } = await auth.signUp.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  if (error) {
    return { error: error.message || "Could not create account." };
  }
  redirect("/");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
