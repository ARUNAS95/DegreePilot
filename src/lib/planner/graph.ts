import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import type { DegreePlan, PlannerInput, ValidationIssue } from "@/lib/types";
import { buildTerms, seasonOf } from "@/lib/terms";
import { getRetriever } from "@/lib/rag/retriever";
import { courseLevel, loadCatalog, normalizeCode, professorsFor } from "@/lib/universities";
import { structured } from "./llm";
import { validatePlan, type DraftTerm } from "./validate";

const MAX_ATTEMPTS = 3;

const ProfileSchema = z.object({
  careerGoal: z.string().describe("One sentence describing what the student is aiming for."),
  interests: z.array(z.string()).describe("Technical areas the student wants to focus on."),
  searchQueries: z
    .array(z.string())
    .describe("3-6 short keyword queries to search a course catalog for relevant electives."),
  workloadPreference: z.enum(["light", "balanced", "intense"]),
  constraints: z.array(z.string()).describe("Scheduling or personal constraints the student mentioned."),
});

const DraftSchema = z.object({
  summary: z.string().describe("2-3 sentences explaining the overall strategy of the plan."),
  electiveStrategy: z.string().describe("Why these electives fit the student's goals."),
  risks: z.array(z.string()).describe("Things the student should double-check or watch out for."),
  terms: z.array(
    z.object({
      term: z.string().describe('Exactly one of the provided term labels, e.g. "Fall 2026".'),
      note: z.string().describe("One short sentence about this term (focus, workload, co-op prep)."),
      courses: z.array(
        z.object({
          code: z.string().describe('Course code exactly as in the catalog, e.g. "CS 5010".'),
          reason: z.string().describe("Why this course, in this term."),
        }),
      ),
    }),
  ),
});

type Enum = [string, ...string[]];

/** Same shape as DraftSchema, but term labels and course codes are constrained to valid values. */
function draftSchemaFor(terms: string[], codes: string[]) {
  return DraftSchema.extend({
    terms: z.array(
      z.object({
        term: z.enum(terms as Enum).describe("One of the provided term labels."),
        note: z.string().describe("One short sentence about this term (focus, workload, co-op prep)."),
        courses: z.array(
          z.object({
            code: z.enum(codes as Enum).describe("Course code from the catalog."),
            reason: z.string().describe("Why this course, in this term."),
          }),
        ),
      }),
    ),
  });
}

type Profile = z.infer<typeof ProfileSchema>;
type Draft = z.infer<typeof DraftSchema>;

const State = Annotation.Root({
  input: Annotation<PlannerInput>,
  terms: Annotation<string[]>,
  profile: Annotation<Profile | null>({ reducer: (_, b) => b, default: () => null }),
  candidates: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  draft: Annotation<Draft | null>({ reducer: (_, b) => b, default: () => null }),
  issues: Annotation<ValidationIssue[]>({ reducer: (_, b) => b, default: () => [] }),
  attempts: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  plan: Annotation<DegreePlan | null>({ reducer: (_, b) => b, default: () => null }),
});

type PlannerState = typeof State.State;

async function context(state: PlannerState) {
  const catalog = await loadCatalog(state.input.universityId);
  const program = catalog.programs.find((p) => p.id === state.input.programId);
  if (!program) throw new Error(`Unknown program "${state.input.programId}"`);
  // Plan only with courses at the program's level (undergraduate vs graduate).
  const courses = catalog.courses.filter((c) => courseLevel(c.code) === program.level);
  return { catalog, program, courses };
}

/** Node 1: turn the student's free-text goals into a structured profile. */
async function understand(state: PlannerState) {
  const { input } = state;
  const profile = await structured({
    schema: ProfileSchema,
    effort: "low",
    maxTokens: 4000,
    system: "You extract structured planning preferences from a student's description of their goals.",
    prompt: `Student's goals and context:\n"""${input.goals || "No goals given - assume a generalist software career."}"""`,
  });
  return { profile };
}

/** Node 2 (RAG): retrieve the catalog courses most relevant to the profile. */
async function retrieve(state: PlannerState) {
  const { program } = await context(state);
  const retriever = await getRetriever(state.input.universityId);
  const queries = [...(state.profile?.searchQueries ?? []), ...(state.profile?.interests ?? [])];
  const best = new Map<string, number>();
  for (const q of queries) {
    for (const hit of retriever.search(q, 16)) {
      if (courseLevel(hit.course.code) !== program.level) continue;
      best.set(hit.course.code, Math.max(best.get(hit.course.code) ?? 0, hit.score));
    }
  }
  const candidates = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([code]) => code);
  return { candidates };
}

/** Node 3: the LLM drafts (or repairs) the term-by-term plan. */
async function draftPlan(state: PlannerState) {
  const { catalog, program, courses } = await context(state);
  const { input, terms, profile, candidates, issues, draft } = state;
  const alignNote = program.level === "graduate" ? " (Align courses CS 5001/5002/5004/5008 don't count)" : "";
  const requirementLines = program.requirements.map((r) =>
    r.kind === "all"
      ? `- ${r.name}: take ALL of ${r.courses.join(", ")}`
      : r.kind === "choose"
        ? `- ${r.name}: take ${r.count} of ${r.courses.join(", ")}`
        : `- ${r.name}: ${r.credits} more credits from ${r.prefix.replace("|", "/")} courses numbered ${r.minLevel}+ not used above${alignNote}`,
  );
  const catalogLines = courses.map(
    (c) =>
      `${c.code} | ${c.title} | ${c.credits}cr | prereqs: ${c.prerequisites.join(", ") || "none"} | offered: ${c.offered.join("/")} | workload ${c.workload}/5`,
  );
  const relevant = candidates.flatMap((code) => {
    const course = catalog.courseMap.get(code);
    if (!course) return [];
    const reviews = professorsFor(catalog, code)
      .slice(0, 2)
      .map((p) => `${p.name} (${p.rating}/5, difficulty ${p.difficulty}): ${p.reviews[0]?.text ?? p.tags.join(", ")}`);
    return [`${code} ${course.title} (${course.topics.join(", ")})${reviews.length ? `\n    reviews: ${reviews.join(" | ")}` : ""}`];
  });
  const termLines = terms.map((t) => `- ${t}${input.coopTerms.includes(t) ? " (CO-OP: no courses)" : ""}`);

  const repair =
    draft && issues.some((i) => i.severity === "error")
      ? `\n\nYour previous draft failed validation. Fix every error below and return a corrected full plan.\nPrevious draft:\n${JSON.stringify(draft.terms)}\nErrors:\n${issues
          .filter((i) => i.severity === "error")
          .map((i) => `- ${i.message}`)
          .join("\n")}`
      : "";

  const result = await structured({
    schema: draftSchemaFor(terms, courses.map((c) => c.code)),
    effort: "medium",
    system:
      "You are DegreePilot, an academic planning assistant. Build a semester-by-semester course plan that satisfies the degree requirements, respects prerequisites and term availability, and fits the student's goals. Use only courses from the catalog provided.",
    prompt: `University: ${catalog.adapter.info.name}
Program: ${program.name} (${program.level}, ${program.totalCredits} credits)

Degree requirements:
${requirementLines.join("\n")}

Terms to plan (use these labels exactly, include every one, in order):
${termLines.join("\n")}

Rules:
- At most ${input.maxCreditsPerTerm} credits per term.
- A course's prerequisites must be completed or planned in an EARLIER term.
- Only schedule a course in a season listed in its "offered" field.
- Don't repeat completed courses: ${input.completedCourses.join(", ") || "none"}.
- Reach at least ${program.totalCredits} counted credits. Leave later terms empty only if requirements are already met.
- Balance heavy courses (workload 5) with lighter ones, matching a "${profile?.workloadPreference ?? "balanced"}" workload preference.

Student profile:
- Goal: ${profile?.careerGoal ?? "not specified"}
- Interests: ${profile?.interests.join(", ") || "not specified"}
- Constraints: ${profile?.constraints.join("; ") || "none"}

Courses most relevant to the student's interests (retrieved from the catalog and reviews):
${relevant.join("\n") || "(none)"}

Full catalog:
${catalogLines.join("\n")}${repair}`,
  });
  return { draft: result, attempts: state.attempts + 1 };
}

/** Node 4: deterministic validation of the draft. */
async function validate(state: PlannerState) {
  const { catalog, program } = await context(state);
  const terms: DraftTerm[] = (state.draft?.terms ?? []).map((t) => ({
    term: t.term,
    courses: t.courses.map((c) => normalizeCode(c.code)),
  }));
  const { issues } = validatePlan(catalog, program, terms, {
    completed: state.input.completedCourses,
    maxCreditsPerTerm: state.input.maxCreditsPerTerm,
    coopTerms: state.input.coopTerms,
  });
  const labels = new Set(terms.map((t) => t.term));
  for (const t of state.terms) {
    if (!labels.has(t)) issues.push({ severity: "error", term: t, message: `Term ${t} is missing from the plan.` });
  }
  return { issues };
}

function routeAfterValidate(state: PlannerState) {
  const hasErrors = state.issues.some((i) => i.severity === "error");
  return hasErrors && state.attempts < MAX_ATTEMPTS ? "draftPlan" : "enrich";
}

/** Node 5: attach professors, offerings and requirement progress for the UI. */
async function enrich(state: PlannerState) {
  const { catalog, program } = await context(state);
  const { input, draft } = state;
  const byTerm = new Map((draft?.terms ?? []).map((t) => [t.term, t]));

  const terms = state.terms.map((label) => {
    const t = byTerm.get(label);
    const courses = (t?.courses ?? []).flatMap((c) => {
      const course = catalog.courseMap.get(normalizeCode(c.code));
      if (!course) return [];
      return [
        {
          code: course.code,
          title: course.title,
          credits: course.credits,
          reason: c.reason,
          prerequisites: course.prerequisites,
          offered: course.offered,
          professors: professorsFor(catalog, course.code, seasonOf(label)).map((p) => ({
            id: p.id,
            name: p.name,
            rating: p.rating,
            difficulty: p.difficulty,
            sample: p.sample,
          })),
        },
      ];
    });
    return {
      term: label,
      isCoop: input.coopTerms.includes(label),
      note: t?.note ?? "",
      credits: courses.reduce((s, c) => s + c.credits, 0),
      courses,
    };
  });

  const { requirements, totalCredits, issues } = validatePlan(
    catalog,
    program,
    terms.map((t) => ({ term: t.term, courses: t.courses.map((c) => c.code) })),
    { completed: input.completedCourses, maxCreditsPerTerm: input.maxCreditsPerTerm, coopTerms: input.coopTerms },
  );

  const plan: DegreePlan = {
    university: catalog.adapter.info.name,
    program: program.name,
    level: program.level,
    summary: draft?.summary ?? "",
    electiveStrategy: draft?.electiveStrategy ?? "",
    risks: draft?.risks ?? [],
    terms,
    requirements,
    issues: [...issues, ...state.issues.filter((i) => i.message.startsWith("Term "))],
    totalCredits,
    attempts: state.attempts,
  };
  return { plan };
}

export const plannerGraph = new StateGraph(State)
  .addNode("understand", understand)
  .addNode("retrieve", retrieve)
  .addNode("draftPlan", draftPlan)
  .addNode("validate", validate)
  .addNode("enrich", enrich)
  .addEdge(START, "understand")
  .addEdge("understand", "retrieve")
  .addEdge("retrieve", "draftPlan")
  .addEdge("draftPlan", "validate")
  .addConditionalEdges("validate", routeAfterValidate, ["draftPlan", "enrich"])
  .addEdge("enrich", END)
  .compile();

export function initialState(input: PlannerInput) {
  return { input, terms: buildTerms(input.startTerm, input.numTerms, input.includeSummer) };
}

export async function runPlanner(input: PlannerInput): Promise<DegreePlan> {
  const final = await plannerGraph.invoke(initialState(input));
  if (!final.plan) throw new Error("Planner finished without a plan.");
  return final.plan;
}
