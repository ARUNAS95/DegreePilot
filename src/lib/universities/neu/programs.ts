import type { DegreeProgram } from "@/lib/types";

// Requirement structures are simplified models of the Khoury programs.
// Always confirm against the official catalog and your degree audit.
export const programs: DegreeProgram[] = [
  {
    id: "bs-cs",
    name: "BS in Computer Science",
    level: "undergraduate",
    totalCredits: 76,
    description:
      "Major requirements only (76 credits): CS core, math, writing and CS electives. NUpath and free electives are up to you.",
    sourceUrl: "https://catalog.northeastern.edu/undergraduate/computer-information-science/computer-science/bscs/",
    requirements: [
      {
        id: "cs-core",
        name: "CS core",
        kind: "all",
        courses: ["CS 1800", "CS 2500", "CS 2510", "CS 2800", "CS 3000", "CS 3500", "CS 3650", "CS 3800", "CS 4500"],
      },
      { id: "math", name: "Math", kind: "all", courses: ["MATH 1341", "MATH 1342", "MATH 2331", "MATH 3081"] },
      { id: "writing", name: "Writing", kind: "all", courses: ["ENGW 1111", "ENGW 3302"] },
      { id: "cs-electives", name: "CS electives (3000+)", kind: "credits", credits: 16, prefix: "CS|DS|CY", minLevel: 3000 },
    ],
  },
  {
    id: "ms-cs",
    name: "MS in Computer Science",
    level: "graduate",
    totalCredits: 32,
    description: "Core software design and algorithms, breadth across systems and AI/data, then electives.",
    sourceUrl: "https://catalog.northeastern.edu/graduate/computer-information-science/computer-science/computer-science-ms/",
    requirements: [
      { id: "core", name: "Core", kind: "all", courses: ["CS 5010", "CS 5800"] },
      {
        id: "breadth-systems",
        name: "Breadth: Systems & Software",
        kind: "choose",
        count: 1,
        courses: ["CS 5500", "CS 5600", "CS 5700", "CS 6620", "CS 6650", "CS 6240"],
      },
      {
        id: "breadth-ai",
        name: "Breadth: AI & Data",
        kind: "choose",
        count: 1,
        courses: ["CS 5100", "CS 5200", "CS 6120", "CS 6140", "CS 6200", "CS 6220"],
      },
      { id: "electives", name: "Electives (CS 5000+)", kind: "credits", credits: 16, prefix: "CS", minLevel: 5000 },
    ],
  },
  {
    id: "ms-ai",
    name: "MS in Artificial Intelligence",
    level: "graduate",
    totalCredits: 32,
    description: "Foundations of AI, algorithms and machine learning, an AI specialization, and electives.",
    sourceUrl: "https://catalog.northeastern.edu/graduate/computer-information-science/artificial-intelligence/",
    requirements: [
      { id: "core", name: "Core", kind: "all", courses: ["CS 5100", "CS 5800", "CS 6140"] },
      {
        id: "ai-specialization",
        name: "AI Specialization",
        kind: "choose",
        count: 2,
        courses: ["CS 5180", "CS 5330", "CS 6120", "CS 7140", "CS 7150", "CS 7180"],
      },
      { id: "electives", name: "Electives (CS/DS 5000+)", kind: "credits", credits: 12, prefix: "CS|DS", minLevel: 5000 },
    ],
  },
];
