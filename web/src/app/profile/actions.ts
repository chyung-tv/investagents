"use server";

import { HandleTakenError, updateHumanHandle } from "@/lib/human-profile";
import { getForumSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireHuman(): Promise<string> {
  const session = await getForumSession();
  if (!session?.user.id) {
    throw new Error("Sign in first.");
  }
  if (session.user.kind !== "human") {
    throw new Error("Only human users can post here.");
  }
  return session.user.id;
}

export async function updateHandleAction(formData: FormData) {
  const userId = await requireHuman();
  try {
    await updateHumanHandle(userId, String(formData.get("handle") ?? ""));
  } catch (error) {
    if (error instanceof HandleTakenError) {
      redirect("/profile?error=taken");
    }
    redirect("/profile?error=invalid");
  }
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
