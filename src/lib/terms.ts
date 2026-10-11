import type { Season } from "@/lib/types";

const ORDER: Season[] = ["Spring", "Summer", "Fall"];

export function parseTerm(term: string): { season: Season; year: number } {
  const [season, year] = term.trim().split(/\s+/);
  if (!ORDER.includes(season as Season) || !/^\d{4}$/.test(year ?? "")) {
    throw new Error(`Invalid term "${term}" (expected e.g. "Fall 2026")`);
  }
  return { season: season as Season, year: Number(year) };
}

export function seasonOf(term: string): Season {
  return parseTerm(term).season;
}

/** Consecutive terms starting at `start`, optionally skipping summers. */
export function buildTerms(start: string, count: number, includeSummer: boolean): string[] {
  let { season, year } = parseTerm(start);
  const terms: string[] = [];
  while (terms.length < count) {
    if (includeSummer || season !== "Summer") terms.push(`${season} ${year}`);
    const i = ORDER.indexOf(season);
    if (i === ORDER.length - 1) year += 1;
    season = ORDER[(i + 1) % ORDER.length];
  }
  return terms;
}

export function upcomingStartTerms(now = new Date(), n = 4): string[] {
  const month = now.getMonth();
  const start: Season = month < 4 ? "Summer" : month < 8 ? "Fall" : "Spring";
  const year = start === "Spring" ? now.getFullYear() + 1 : now.getFullYear();
  return buildTerms(`${start} ${year}`, n, true);
}
