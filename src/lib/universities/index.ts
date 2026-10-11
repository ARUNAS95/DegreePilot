import type { Course, DegreeProgram, Level, Professor } from "@/lib/types";
import { northeastern } from "./neu";
import type { UniversityAdapter } from "./types";

const adapters: Record<string, UniversityAdapter> = {
  [northeastern.info.id]: northeastern,
};

export function listUniversities() {
  return Object.values(adapters).map((a) => a.info);
}

export function getUniversity(id: string): UniversityAdapter {
  const adapter = adapters[id];
  if (!adapter) throw new Error(`Unknown university "${id}"`);
  return adapter;
}

export interface Catalog {
  adapter: UniversityAdapter;
  courses: Course[];
  courseMap: Map<string, Course>;
  programs: DegreeProgram[];
  professors: Professor[];
}

export async function loadCatalog(universityId: string): Promise<Catalog> {
  const adapter = getUniversity(universityId);
  const [courses, programs, professors] = await Promise.all([
    adapter.listCourses(),
    adapter.listPrograms(),
    adapter.listProfessors(),
  ]);
  return {
    adapter,
    courses,
    courseMap: new Map(courses.map((c) => [normalizeCode(c.code), c])),
    programs,
    professors,
  };
}

/** "cs5010", "CS-5010" and "cs 5010" all become "CS 5010". */
export function normalizeCode(code: string): string {
  const m = code.trim().toUpperCase().match(/^([A-Z]{2,4})[\s-]*(\d{4})$/);
  return m ? `${m[1]} ${m[2]}` : code.trim().toUpperCase();
}

export function professorsFor(catalog: Catalog, code: string, season?: string) {
  return catalog.professors
    .filter((p) => p.teaches.some((t) => t.course === code && (!season || t.seasons.includes(season as never))))
    .sort((a, b) => b.rating - a.rating);
}

/** Course numbers 5000+ are graduate level (NEU-style numbering). */
export function courseLevel(code: string): Level {
  return Number(code.split(" ")[1]) >= 5000 ? "graduate" : "undergraduate";
}
