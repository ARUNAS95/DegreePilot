import MiniSearch from "minisearch";
import type { Course } from "@/lib/types";
import { loadCatalog, type Catalog } from "@/lib/universities";

export interface RetrievedCourse {
  course: Course;
  score: number;
  /** Review snippets about this course, used as grounding context for the LLM. */
  reviewSnippets: string[];
}

interface Doc {
  id: string;
  code: string;
  title: string;
  description: string;
  topics: string;
  reviews: string;
}

/**
 * Lexical (BM25-style) retriever over the course catalog plus professor reviews.
 * The interface is deliberately small so it can be swapped for a vector store
 * (e.g. pgvector + embeddings) without touching the planner graph.
 */
export interface Retriever {
  search(query: string, k?: number): RetrievedCourse[];
}

const cache = new Map<string, Retriever>();

export async function getRetriever(universityId: string): Promise<Retriever> {
  const hit = cache.get(universityId);
  if (hit) return hit;
  const retriever = buildRetriever(await loadCatalog(universityId));
  cache.set(universityId, retriever);
  return retriever;
}

function buildRetriever(catalog: Catalog): Retriever {
  const reviewsByCourse = new Map<string, string[]>();
  for (const prof of catalog.professors) {
    for (const t of prof.teaches) {
      const list = reviewsByCourse.get(t.course) ?? [];
      list.push(...prof.reviews.map((r) => `${prof.name}: ${r.text}`), ...prof.tags);
      reviewsByCourse.set(t.course, list);
    }
  }

  const index = new MiniSearch<Doc>({
    fields: ["code", "title", "description", "topics", "reviews"],
    storeFields: ["code"],
    searchOptions: {
      boost: { title: 3, topics: 3, code: 2, description: 1.5, reviews: 0.5 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "OR",
    },
  });
  index.addAll(
    catalog.courses.map((c) => ({
      id: c.code,
      code: c.code,
      title: c.title,
      description: c.description,
      topics: c.topics.join(" "),
      reviews: (reviewsByCourse.get(c.code) ?? []).join(" "),
    })),
  );

  return {
    search(query, k = 12) {
      if (!query.trim()) return [];
      return index
        .search(query)
        .slice(0, k)
        .map((hit) => ({
          course: catalog.courseMap.get(hit.id as string)!,
          score: Math.round(hit.score * 100) / 100,
          reviewSnippets: (reviewsByCourse.get(hit.id as string) ?? []).filter((s) => s.includes(":")).slice(0, 2),
        }));
    },
  };
}
