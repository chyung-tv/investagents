import { adminHref } from "@/lib/admin-href";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  redirect(adminHref({ agent: id, created: query.created === "1" }));
}
