"use server";

import { getThread } from "@/lib/queries";

export async function loadThreadPageAction(input: {
  id: string;
  page: number;
  viewerId: string | null;
}) {
  return getThread(input.id, {
    page: input.page,
    viewerId: input.viewerId,
  });
}
