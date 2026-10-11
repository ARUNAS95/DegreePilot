import { describe, expect, it } from "vitest";
import { validatePlan } from "@/lib/planner/validate";
import { buildTerms } from "@/lib/terms";
import { loadCatalog } from "@/lib/universities";

const opts = { completed: [], maxCreditsPerTerm: 8, coopTerms: [] };

describe("buildTerms", () => {
  it("skips summers unless asked", () => {
    expect(buildTerms("Fall 2026", 3, false)).toEqual(["Fall 2026", "Spring 2027", "Fall 2027"]);
    expect(buildTerms("Spring 2027", 3, true)).toEqual(["Spring 2027", "Summer 2027", "Fall 2027"]);
  });
});

describe("validatePlan", async () => {
  const catalog = await loadCatalog("neu");
  const msCs = catalog.programs.find((p) => p.id === "ms-cs")!;

  it("accepts a complete, valid MS CS plan", () => {
    const { issues, totalCredits } = validatePlan(
      catalog,
      msCs,
      [
        { term: "Fall 2026", courses: ["CS 5010", "CS 5800"] },
        { term: "Spring 2027", courses: ["CS 5500", "CS 6120"] },
        { term: "Fall 2027", courses: ["CS 6650", "CS 5610"] },
        { term: "Spring 2028", courses: ["CS 6620", "CS 6140"] },
      ],
      opts,
    );
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(totalCredits).toBe(32);
  });

  it("flags prerequisites, offerings, credit load and missing requirements", () => {
    const { issues } = validatePlan(
      catalog,
      msCs,
      [{ term: "Fall 2026", courses: ["CS 7140", "CS 5500", "CS 5800"] }],
      opts,
    );
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/CS 7140 is not usually offered in Fall/);
    expect(messages).toMatch(/CS 7140 requires CS 6140/);
    expect(messages).toMatch(/CS 5500 requires CS 5010/);
    expect(messages).toMatch(/12 credits, above the 8-credit limit/);
    expect(messages).toMatch(/Requirement not met - Core/);
  });

  it("does not count Align bridge courses as electives", () => {
    const { requirements } = validatePlan(
      catalog,
      msCs,
      [{ term: "Fall 2026", courses: ["CS 5001", "CS 5002"] }],
      { ...opts, maxCreditsPerTerm: 16 },
    );
    expect(requirements.find((r) => r.id === "electives")?.fulfilledBy).toEqual([]);
  });
});

describe("robustness and undergraduate programs", async () => {
  const catalog = await loadCatalog("neu");

  it("reports a malformed term label instead of throwing", () => {
    const msCs = catalog.programs.find((p) => p.id === "ms-cs")!;
    const { issues } = validatePlan(catalog, msCs, [{ term: "Fall 8 2028", courses: ["CS 5010"] }], opts);
    expect(issues.map((i) => i.message)).toContain('"Fall 8 2028" is not a valid term name.');
  });

  it("accepts a complete BS CS major plan", () => {
    const bsCs = catalog.programs.find((p) => p.id === "bs-cs")!;
    expect(bsCs.level).toBe("undergraduate");
    const { issues, totalCredits } = validatePlan(
      catalog,
      bsCs,
      [
        { term: "Fall 2026", courses: ["CS 1800", "CS 2500", "MATH 1341", "ENGW 1111"] },
        { term: "Spring 2027", courses: ["CS 2510", "CS 2800", "MATH 1342", "MATH 2331"] },
        { term: "Fall 2027", courses: ["CS 3000", "CS 3500", "CS 3650", "MATH 3081"] },
        { term: "Spring 2028", courses: ["CS 3800", "CS 3200", "CS 4550", "ENGW 3302"] },
        { term: "Fall 2028", courses: ["CS 4500", "CS 3700", "CS 4100"] },
      ],
      { completed: [], maxCreditsPerTerm: 16, coopTerms: [] },
    );
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(totalCredits).toBe(76);
  });
});
