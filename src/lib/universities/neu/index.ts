import type { UniversityAdapter } from "@/lib/universities/types";
import { courses } from "./courses";
import { professors } from "./professors";
import { programs } from "./programs";

export const northeastern: UniversityAdapter = {
  info: {
    id: "neu",
    name: "Northeastern University",
    shortName: "Northeastern",
    termSystem: "semester",
    dataNote:
      "Course titles follow the public catalog; offering patterns are approximate and professor reviews are demo data.",
  },
  listCourses: async () => courses,
  listPrograms: async () => programs,
  listProfessors: async () => professors,
};
