import { listUniversities, loadCatalog } from "@/lib/universities";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("university");
  if (!id) return Response.json({ universities: listUniversities() });
  try {
    const { adapter, courses, programs, professors } = await loadCatalog(id);
    return Response.json({ university: adapter.info, courses, programs, professors });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 });
  }
}
