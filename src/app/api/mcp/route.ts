import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { PlannerInputSchema } from "@/lib/planner/input";
import { runPlanner } from "@/lib/planner/graph";
import { validatePlan } from "@/lib/planner/validate";
import { getRetriever } from "@/lib/rag/retriever";
import { listUniversities, loadCatalog, normalizeCode, professorsFor } from "@/lib/universities";

export const maxDuration = 300;

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

const university = z.string().describe('University id from list_universities, e.g. "neu".');

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_universities",
      { title: "List universities", description: "Universities DegreePilot has course data for.", inputSchema: z.object({}) },
      async () => json(listUniversities()),
    );

    server.registerTool(
      "list_programs",
      {
        title: "List degree programs",
        description: "Degree programs at a university, with their requirement structure.",
        inputSchema: z.object({ university }),
      },
      async ({ university }) => {
        const { programs } = await loadCatalog(university);
        return json(programs);
      },
    );

    server.registerTool(
      "search_courses",
      {
        title: "Search courses",
        description: "Search a university's course catalog and course reviews by topic, title or code.",
        inputSchema: z.object({ university, query: z.string(), limit: z.number().int().min(1).max(25).default(8) }),
      },
      async ({ university, query, limit }) => {
        const retriever = await getRetriever(university);
        return json(retriever.search(query, limit).map((r) => ({ ...r.course, score: r.score, reviews: r.reviewSnippets })));
      },
    );

    server.registerTool(
      "get_course",
      {
        title: "Get course details",
        description: "Course details including prerequisites, the seasons it's offered, and who teaches it.",
        inputSchema: z.object({ university, code: z.string().describe('e.g. "CS 5800"') }),
      },
      async ({ university, code }) => {
        const catalog = await loadCatalog(university);
        const course = catalog.courseMap.get(normalizeCode(code));
        if (!course) return fail(`No course ${code} at ${university}.`);
        const professors = professorsFor(catalog, course.code).map(({ teaches, ...p }) => ({
          ...p,
          seasons: teaches.find((t) => t.course === course.code)?.seasons,
        }));
        return json({ ...course, professors });
      },
    );

    server.registerTool(
      "get_professor_reviews",
      {
        title: "Get professor reviews",
        description: "Ratings, tags and reviews for professors whose name matches the query.",
        inputSchema: z.object({ university, name: z.string() }),
      },
      async ({ university, name }) => {
        const { professors } = await loadCatalog(university);
        const matches = professors.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()));
        return matches.length ? json(matches) : fail(`No professor matching "${name}".`);
      },
    );

    server.registerTool(
      "validate_plan",
      {
        title: "Validate a course plan",
        description:
          "Check a term-by-term plan against prerequisites, term availability, credit limits and degree requirements.",
        inputSchema: z.object({
          university,
          program: z.string().describe("Program id from list_programs."),
          terms: z.array(z.object({ term: z.string().describe('e.g. "Fall 2026"'), courses: z.array(z.string()) })),
          completedCourses: z.array(z.string()).default([]),
          maxCreditsPerTerm: z.number().int().default(8),
          coopTerms: z.array(z.string()).default([]),
        }),
      },
      async ({ university, program, terms, completedCourses, maxCreditsPerTerm, coopTerms }) => {
        const catalog = await loadCatalog(university);
        const prog = catalog.programs.find((p) => p.id === program);
        if (!prog) return fail(`Unknown program "${program}".`);
        try {
          return json(validatePlan(catalog, prog, terms, { completed: completedCourses, maxCreditsPerTerm, coopTerms }));
        } catch (err) {
          return fail((err as Error).message);
        }
      },
    );

    server.registerTool(
      "generate_degree_plan",
      {
        title: "Generate a degree plan",
        description:
          "Run DegreePilot's full planner (goal understanding, catalog retrieval, LLM drafting, validation loop). Takes up to a few minutes.",
        inputSchema: PlannerInputSchema,
      },
      async (input) => {
        try {
          return json(await runPlanner(input));
        } catch (err) {
          return fail((err as Error).message);
        }
      },
    );

    server.registerPrompt(
      "plan_my_degree",
      {
        title: "Plan my degree",
        description: "Start a conversation that builds a semester-by-semester plan using DegreePilot's tools.",
        argsSchema: z.object({ goals: z.string().describe("Your career goals and interests") }),
      },
      ({ goals }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me plan my degree with the DegreePilot tools. My goals: ${goals}. Start by listing universities and programs, then search courses that match my goals, draft a plan, and run validate_plan before showing it to me.`,
            },
          },
        ],
      }),
    );
  },
  { serverInfo: { name: "degreepilot", version: "0.1.0" } },
);

export { handler as GET, handler as POST };
