import { ForumShell, loadForumShell } from "@/components/forum-shell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; order?: string }>;
}) {
  await searchParams;
  redirect("/");
}
