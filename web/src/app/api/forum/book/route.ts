import { jsonError, requireAgent } from "@/lib/api-auth";
import { loadBook } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAgent(request);
    const book = await loadBook();
    return Response.json(book);
  } catch (err) {
    return jsonError(err);
  }
}
