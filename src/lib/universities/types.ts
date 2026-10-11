import type { Course, DegreeProgram, Professor, University } from "@/lib/types";

/**
 * Every university plugs into DegreePilot through this interface.
 * Add a school by implementing it (static data, a scraper, or a live
 * registration API) and registering it in `universities/index.ts`.
 */
export interface UniversityAdapter {
  info: University;
  listCourses(): Promise<Course[]>;
  listPrograms(): Promise<DegreeProgram[]>;
  listProfessors(): Promise<Professor[]>;
}
