import { CatalogView } from "@/components/catalog/catalog-view";
import { loadCatalog } from "@/lib/universities";

export const metadata = { title: "Courses & Professors - DegreePilot" };

export default async function CatalogPage() {
  const { adapter, courses, professors } = await loadCatalog("neu");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Courses & professors</h1>
      <p className="mt-2 text-muted">
        {adapter.info.name} · {courses.length} courses · {adapter.info.dataNote}
      </p>
      <CatalogView courses={courses} professors={professors} />
    </div>
  );
}
