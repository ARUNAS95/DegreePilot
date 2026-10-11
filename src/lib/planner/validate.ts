import type { DegreeProgram, RequirementProgress, Season, ValidationIssue } from "@/lib/types";
import type { Catalog } from "@/lib/universities";
import { normalizeCode } from "@/lib/universities";
import { parseTerm } from "@/lib/terms";

export interface DraftTerm {
  term: string;
  courses: string[];
}

export interface ValidationResult {
  issues: ValidationIssue[];
  requirements: RequirementProgress[];
  totalCredits: number;
}

/**
 * Deterministic checks the LLM's draft must pass: courses exist, prerequisites
 * are met in an earlier term, the course is offered that season, credit load,
 * no repeats, and the degree requirements are covered.
 */
export function validatePlan(
  catalog: Catalog,
  program: DegreeProgram,
  terms: DraftTerm[],
  opts: { completed: string[]; maxCreditsPerTerm: number; coopTerms: string[] },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const done = new Set(opts.completed.map(normalizeCode));
  const planned: string[] = [];

  for (const t of terms) {
    let season: Season | null = null;
    try {
      season = parseTerm(t.term).season;
    } catch {
      issues.push({ severity: "error", term: t.term, message: `"${t.term}" is not a valid term name.` });
    }
    const isCoop = opts.coopTerms.includes(t.term);
    let credits = 0;
    const thisTerm: string[] = [];
    for (const raw of t.courses) {
      const code = normalizeCode(raw);
      const course = catalog.courseMap.get(code);
      if (!course) {
        issues.push({ severity: "error", term: t.term, course: code, message: `${code} is not in the catalog.` });
        continue;
      }
      if (isCoop) {
        issues.push({ severity: "error", term: t.term, course: code, message: `${t.term} is a co-op term; no courses should be scheduled.` });
      }
      if (done.has(code) || planned.includes(code) || thisTerm.includes(code)) {
        issues.push({ severity: "error", term: t.term, course: code, message: `${code} is already completed or planned elsewhere.` });
      }
      if (season && !course.offered.includes(season)) {
        issues.push({
          severity: "error",
          term: t.term,
          course: code,
          message: `${code} is not usually offered in ${season} (offered: ${course.offered.join(", ")}).`,
        });
      }
      const missing = course.prerequisites.filter((p) => !done.has(p) && !planned.includes(p));
      if (missing.length) {
        issues.push({
          severity: "error",
          term: t.term,
          course: code,
          message: `${code} requires ${missing.join(", ")} in an earlier term.`,
        });
      }
      credits += course.credits;
      thisTerm.push(code);
    }
    if (credits > opts.maxCreditsPerTerm) {
      issues.push({
        severity: "error",
        term: t.term,
        message: `${t.term} has ${credits} credits, above the ${opts.maxCreditsPerTerm}-credit limit.`,
      });
    }
    const workload = thisTerm.reduce((s, c) => s + (catalog.courseMap.get(c)?.workload ?? 0), 0);
    if (thisTerm.length >= 2 && workload / thisTerm.length >= 4.5) {
      issues.push({ severity: "warning", term: t.term, message: `${t.term} pairs several very heavy courses.` });
    }
    planned.push(...thisTerm);
  }

  const taken = [...done, ...planned];
  const requirements = checkRequirements(catalog, program, taken);
  for (const r of requirements) {
    if (!r.satisfied) issues.push({ severity: "error", message: `Requirement not met - ${r.name}: ${r.detail}` });
  }
  const totalCredits = taken.reduce((s, c) => s + (catalog.courseMap.get(c)?.credits ?? 0), 0);
  if (totalCredits < program.totalCredits) {
    issues.push({
      severity: "error",
      message: `Plan totals ${totalCredits} credits; the program needs ${program.totalCredits}.`,
    });
  }
  return { issues, requirements, totalCredits };
}

export function checkRequirements(catalog: Catalog, program: DegreeProgram, taken: string[]): RequirementProgress[] {
  const used = new Set<string>();
  const out: RequirementProgress[] = [];
  // Specific requirements claim courses first so electives only count leftovers.
  for (const req of program.requirements) {
    if (req.kind === "all") {
      const have = req.courses.filter((c) => taken.includes(c));
      have.forEach((c) => used.add(c));
      const missing = req.courses.filter((c) => !taken.includes(c));
      out.push({
        id: req.id,
        name: req.name,
        satisfied: missing.length === 0,
        detail: missing.length ? `missing ${missing.join(", ")}` : "complete",
        fulfilledBy: have,
      });
    } else if (req.kind === "choose") {
      const have = req.courses.filter((c) => taken.includes(c) && !used.has(c)).slice(0, req.count);
      have.forEach((c) => used.add(c));
      out.push({
        id: req.id,
        name: req.name,
        satisfied: have.length >= req.count,
        detail: have.length >= req.count ? "complete" : `need ${req.count - have.length} more of ${req.courses.join(", ")}`,
        fulfilledBy: have,
      });
    }
  }
  for (const req of program.requirements) {
    if (req.kind !== "credits") continue;
    const prefixes = req.prefix.split("|");
    const pool = taken.filter((c) => {
      const [subject, num] = c.split(" ");
      // Align bridge courses don't count toward graduate electives.
      const bridge = catalog.courseMap.get(c)?.topics.includes("align");
      return !used.has(c) && !bridge && prefixes.includes(subject) && Number(num) >= req.minLevel;
    });
    let credits = 0;
    const have: string[] = [];
    for (const c of pool) {
      if (credits >= req.credits) break;
      credits += catalog.courseMap.get(c)?.credits ?? 0;
      have.push(c);
      used.add(c);
    }
    out.push({
      id: req.id,
      name: req.name,
      satisfied: credits >= req.credits,
      detail: credits >= req.credits ? "complete" : `${credits}/${req.credits} credits`,
      fulfilledBy: have,
    });
  }
  return out;
}
