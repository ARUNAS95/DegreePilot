import { beforeEach, describe, expect, it, vi } from "vitest";

const structured = vi.fn();
vi.mock("@/lib/planner/llm", () => ({ structured: (...args: unknown[]) => structured(...args), MODEL: "mock" }));

const { runPlanner } = await import("@/lib/planner/graph");

const profile = {
  careerGoal: "Backend engineer",
  interests: ["distributed systems", "cloud"],
  searchQueries: ["distributed systems", "cloud computing", "databases"],
  workloadPreference: "balanced",
  constraints: [],
};
const draft = (fall27: string[]) => ({
  summary: "Core first, then systems electives.",
  electiveStrategy: "Backend-heavy electives.",
  risks: [],
  terms: [
    { term: "Fall 2026", note: "", courses: [{ code: "CS 5010", reason: "core" }, { code: "CS 5800", reason: "core" }] },
    { term: "Spring 2027", note: "", courses: [{ code: "CS 5500", reason: "" }, { code: "CS 5200", reason: "" }] },
    { term: "Fall 2027", note: "", courses: fall27.map((code) => ({ code, reason: "" })) },
    { term: "Spring 2028", note: "", courses: [{ code: "CS 6620", reason: "" }, { code: "CS 6240", reason: "" }] },
  ],
});

const input = {
  universityId: "neu",
  programId: "ms-cs",
  goals: "backend at big tech",
  completedCourses: [],
  startTerm: "Fall 2026",
  numTerms: 4,
  includeSummer: false,
  maxCreditsPerTerm: 8,
  coopTerms: [],
};

describe("planner graph", () => {
  beforeEach(() => structured.mockReset());

  it("retrieves relevant courses and returns an enriched, valid plan", async () => {
    structured.mockResolvedValueOnce(profile).mockResolvedValueOnce(draft(["CS 6650", "CS 5610"]));
    const plan = await runPlanner(input);
    expect(plan.attempts).toBe(1);
    expect(plan.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(plan.terms[2].courses[0].professors[0]?.name).toBeDefined();
    // The RAG step should have surfaced systems courses in the drafting prompt.
    expect(structured.mock.calls[1][0].prompt).toMatch(/CS 6650/);
  });

  it("feeds validation errors back to Claude and repairs the plan", async () => {
    structured
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(draft(["CS 6650", "CS 7140"])) // CS 7140: spring only, needs CS 6140
      .mockResolvedValueOnce(draft(["CS 6650", "CS 5610"]));
    const plan = await runPlanner(input);
    expect(plan.attempts).toBe(2);
    expect(structured.mock.calls[2][0].prompt).toMatch(/failed validation[\s\S]*CS 7140/);
    expect(plan.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});
