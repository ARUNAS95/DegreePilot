"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ExternalLink, Search, Star } from "lucide-react";
import type { Course, Professor, Season } from "@/lib/types";
import { Badge, Card, Rating, inputClass } from "@/components/ui";

const SEASONS: Season[] = ["Fall", "Spring", "Summer"];

export function CatalogExplorer({ courses, professors }: { courses: Course[]; professors: Professor[] }) {
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState<Season | null>(null);
  const [selected, setSelected] = useState<string | null>(courses[0]?.code ?? null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(
      (c) =>
        (!season || c.offered.includes(season)) &&
        (!q || `${c.code} ${c.title} ${c.topics.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [courses, query, season]);

  const course = courses.find((c) => c.code === selected);
  const teachers = professors
    .filter((p) => p.teaches.some((t) => t.course === selected))
    .sort((a, b) => b.rating - a.rating);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code, title or topic (e.g. llm, cloud)"
              className={clsx(inputClass, "pl-9")}
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
            {SEASONS.map((s) => (
              <button
                key={s}
                onClick={() => setSeason(season === s ? null : s)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  season === s ? "bg-primary text-white" : "text-muted hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-4 grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
          {filtered.map((c) => (
            <li key={c.code}>
              <button
                onClick={() => setSelected(c.code)}
                className={clsx(
                  "w-full rounded-xl border p-3 text-left transition",
                  selected === c.code ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border bg-surface hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx("font-mono text-xs font-medium", "text-primary-ink")}>
                    {c.code}
                  </span>
                  <span className={clsx("text-xs", "text-muted")}>
                    {c.offered.join(" · ")}
                  </span>
                </div>
                <p className="text-sm font-medium">{c.title}</p>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted">No courses match.</p>}
        </ul>
      </div>

      {course && (
        <div className="grid content-start gap-4 lg:sticky lg:top-20">
          <Card className="p-6">
            <p className="font-mono text-sm font-medium text-primary-ink">{course.code}</p>
            <h2 className="text-2xl font-semibold">{course.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{course.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted">Credits</p>
                <p className="font-medium">{course.credits}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Workload</p>
                <p className="font-medium">{"●".repeat(course.workload)}{"○".repeat(5 - course.workload)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Prerequisites</p>
                <p className="font-medium">{course.prerequisites.join(", ") || "None"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {course.offered.map((s) => (
                <Badge key={s} tone="primary">
                  {s}
                </Badge>
              ))}
              {course.topics.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </Card>

          <h3 className="mt-2 text-xl font-semibold">Who teaches it</h3>
          {teachers.length === 0 && <p className="text-sm text-muted">No instructor data yet.</p>}
          {teachers.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {p.name} {p.sample && <Badge>Sample data</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    Teaches {course.code} in {p.teaches.find((t) => t.course === course.code)?.seasons.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-lg">
                    <Star className="size-4 fill-current text-secondary" />
                    <Rating value={p.rating} />
                  </p>
                  <p className="text-xs text-muted">
                    difficulty {p.difficulty.toFixed(1)} · {p.wouldTakeAgain}% again
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <ul className="mt-3 grid gap-2">
                {p.reviews.map((r, i) => (
                  <li key={i} className="rounded-lg bg-surface-muted p-3 text-sm">
                    <p className="leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.term} · rating {r.rating} · difficulty {r.difficulty}
                    </p>
                  </li>
                ))}
              </ul>
              {!p.sample && (
                <a
                  href={`https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(p.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary-ink hover:underline"
                >
                  More reviews on RateMyProfessors <ExternalLink className="size-3" />
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
