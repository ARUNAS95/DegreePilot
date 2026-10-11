"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { List, Network } from "lucide-react";
import type { Course, Level, Professor } from "@/lib/types";
import { CourseGraph, type GraphLink, type GraphNode } from "@/components/graph/course-graph";
import { CatalogExplorer } from "./catalog-explorer";

const SUBJECTS = ["CS", "DS", "CY", "MATH", "ENGW"];
const levelOf = (code: string): Level => (Number(code.split(" ")[1]) >= 5000 ? "graduate" : "undergraduate");

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; icon?: typeof List }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-xl bg-surface-muted p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === o.id ? "bg-surface text-primary-ink shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground",
          )}
        >
          {o.icon && <o.icon className="size-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CatalogView({ courses, professors }: { courses: Course[]; professors: Professor[] }) {
  const [level, setLevel] = useState<Level>("graduate");
  const [view, setView] = useState<"list" | "graph">("list");
  const levelCourses = useMemo(() => courses.filter((c) => levelOf(c.code) === level), [courses, level]);

  // Prerequisite map: columns by course level (1000s, 2000s...), colored by subject.
  const graph = useMemo(() => {
    const codes = new Set(levelCourses.map((c) => c.code));
    const minK = Math.min(...levelCourses.map((c) => Math.floor(Number(c.code.split(" ")[1]) / 1000)));
    const nodes: GraphNode[] = levelCourses.map((c) => {
      const k = Math.floor(Number(c.code.split(" ")[1]) / 1000);
      return { id: c.code, label: c.title, group: c.code.split(" ")[0], subtitle: `${k}000-level`, column: k - minK };
    });
    const links: GraphLink[] = levelCourses.flatMap((c) =>
      c.prerequisites.filter((p) => codes.has(p)).map((p) => ({ source: p, target: c.code })),
    );
    return { nodes, links };
  }, [levelCourses]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Level"
          value={level}
          onChange={setLevel}
          options={[
            { id: "undergraduate", label: "Undergraduate" },
            { id: "graduate", label: "Graduate" },
          ]}
        />
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { id: "list", label: "List", icon: List },
            { id: "graph", label: "Prerequisite map", icon: Network },
          ]}
        />
      </div>

      {view === "graph" ? (
        <div className="mt-6">
          <CourseGraph
            nodes={graph.nodes}
            links={graph.links}
            groups={SUBJECTS}
            height={560}
            caption="Left to right by course level · hover to see what a course unlocks"
          />
        </div>
      ) : (
        <CatalogExplorer key={level} courses={levelCourses} professors={professors} />
      )}
    </div>
  );
}
