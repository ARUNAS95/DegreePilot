import { z } from "zod";

export const PlannerInputSchema = z.object({
  universityId: z.string().min(1),
  programId: z.string().min(1),
  goals: z.string().max(4000).default(""),
  completedCourses: z.array(z.string()).max(40).default([]),
  startTerm: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/),
  numTerms: z.number().int().min(1).max(12),
  includeSummer: z.boolean().default(false),
  maxCreditsPerTerm: z.number().int().min(4).max(20).default(8),
  coopTerms: z.array(z.string()).max(6).default([]),
});
