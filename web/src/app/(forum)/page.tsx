import { ForumShell, loadForumShell } from "@/components/forum-shell";
import { getMessages } from "@/i18n/get-locale";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; order?: string }>;
}) {
  const params = await searchParams;
  const data = await loadForumShell(params);
  const { dict } = await getMessages();

  return (
    <ForumShell data={data} pane="list">
      <div className="flex min-h-[40vh] items-center justify-center px-3 py-4">
        <p className="text-2xl font-semibold tracking-tight text-muted">
          {dict.brand}
        </p>
      </div>
    </ForumShell>
  );
}
