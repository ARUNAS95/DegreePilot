export type Season = "Fall" | "Spring" | "Summer";

export interface Course {
  code: string; // e.g. "CS 5010"
  title: string;
  credits: number;
  description: string;
  prerequisites: string[]; // all must be satisfied (codes)
  offered: Season[];
  topics: string[];
  workload: 1 | 2 | 3 | 4 | 5; // 1 = light, 5 = very heavy
}

export interface Review {
  rating: number; // 1-5
  difficulty: number; // 1-5
  term: string;
  text: string;
}

export interface Professor {
  id: string;
  name: string;
  department: string;
  rating: number;
  difficulty: number;
  wouldTakeAgain: number; // percent
  tags: string[];
  teaches: { course: string; seasons: Season[] }[];
  reviews: Review[];
  sample: boolean; // true when this is demo data, not a real person
}

export type Requirement =
  | { id: string; name: string; kind: "all"; courses: string[] }
  | { id: string; name: string; kind: "choose"; count: number; courses: string[] }
  | { id: string; name: string; kind: "credits"; credits: number; prefix: string; minLevel: number };

export type Level = "undergraduate" | "graduate";

export interface DegreeProgram {
  id: string;
  name: string;
  level: Level;
  totalCredits: number;
  description: string;
  requirements: Requirement[];
  sourceUrl: string;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  termSystem: "semester" | "quarter";
  dataNote: string;
}

export interface PlannerInput {
  universityId: string;
  programId: string;
  goals: string;
  completedCourses: string[];
  startTerm: string; // e.g. "Fall 2026"
  numTerms: number;
  includeSummer: boolean;
  maxCreditsPerTerm: number;
  coopTerms: string[];
}

export interface PlannedCourse {
  code: string;
  title: string;
  credits: number;
  reason: string;
  prerequisites: string[];
  professors: { id: string; name: string; rating: number; difficulty: number; sample: boolean }[];
  offered: Season[];
}

export interface PlannedTerm {
  term: string;
  isCoop: boolean;
  credits: number;
  note: string;
  courses: PlannedCourse[];
}

export interface RequirementProgress {
  id: string;
  name: string;
  satisfied: boolean;
  detail: string;
  fulfilledBy: string[];
}

export interface ValidationIssue {
  severity: "error" | "warning";
  term?: string;
  course?: string;
  message: string;
}

export interface DegreePlan {
  university: string;
  program: string;
  level: Level;
  summary: string;
  electiveStrategy: string;
  risks: string[];
  terms: PlannedTerm[];
  requirements: RequirementProgress[];
  issues: ValidationIssue[];
  totalCredits: number;
  attempts: number;
}
