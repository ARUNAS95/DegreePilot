"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { AlertTriangle, Briefcase, CheckCircle2, ChevronDown, Circle, Copy, List, Network, Printer, Star } from "lucide-react";
import type { DegreePlan, PlannedCourse } from "@/lib/types";
import { Badge, Button, Card, Rating } from "@/components/ui";
import { CourseGraph, type GraphLink, type GraphNode } from "@/components/graph/course-graph";

export function PlanView({ plan }: { plan: DegreePlan }) {
  const errors = plan.issues.filter((i) => i.severity === "error");
  const warnings = plan.issues.filter((i) => i.severity === "warning");
  const satisfied = plan.requirements.filter((r) => r.satisfied).length;
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"timeline" | "graph">("timeline");
  const graph = useMemo(() => planGraph(plan), [plan]);

  function copy() {
    const text = [
      `${plan.program} - ${plan.university}`,
      "",
      ...plan.terms.flatMap((t) => [
        `${t.term}${t.isCoop ? " (co-op)" : ""}`,
        ...t.courses.map((c) => `  ${c.code} ${c.title}${c.professors[0] ? ` - ${c.professors[0].name}` : ""}`),
      ]),
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="grid gap-6">
      <Card className="border-t-4 border-t-primary p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {plan.university} · {plan.program}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">Your roadmap</h2>
          </div>
          <div className="no-print flex gap-2">
            <Button variant="secondary" onClick={copy} className="px-3 py-2">
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" onClick={() => window.print()} className="px-3 py-2">
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </div>
        <p className="mt-3 leading-relaxed text-muted">{plan.summary}</p>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Credits" value={`${plan.totalCredits}`} />
          <Stat label="Requirements" value={`${satisfied} of ${plan.requirements.length}`} />
          <Stat
            label="Checks"
            value={errors.length ? `${errors.length} to fix` : "All passed"}
            tone={errors.length ? "danger" : "success"}
          />
        </dl>
      </Card>

      <div className="no-print flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">Semester by semester</h3>
        <div role="tablist" aria-label="Roadmap view" className="flex gap-1 rounded-xl bg-surface-muted p-1">
          {([
            ["timeline", "Timeline", List],
            ["graph", "Graph", Network],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                view === id ? "bg-surface text-primary-ink shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "graph" ? (
        <CourseGraph
          nodes={graph.nodes}
          links={graph.links}
          groups={graph.groups}
          mutedGroups={["Completed"]}
          caption="Left to right by semester · hover to trace prerequisites"
        />
      ) : (
    <ol className="grid gap-3">
          {plan.terms.map((t, i) => (
            <motion.li key={t.term} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="grid gap-3 p-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
                <div>
                  <h3 className="text-lg font-semibold">{t.term}</h3>
                  {t.isCoop ? (
                    <Badge tone="primary" className="mt-1">
                      <Briefcase className="size-3" /> Co-op
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted">{t.credits} credits</p>
                  )}
                  {t.note && <p className="mt-2 hidden text-xs leading-relaxed text-muted sm:block">{t.note}</p>}
                </div>
                <div className="grid content-start gap-2">
                  {t.courses.map((c) => (
                    <CourseRow key={c.code} course={c} />
                  ))}
                  {t.courses.length === 0 && (
                    <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
                      {t.isCoop
                        ? "Full-time co-op. No classes this term."
                        : plan.level === "undergraduate"
                          ? "Major requirements done. Use this term for NUpath and free electives."
                          : "No courses needed this term."}
                    </p>
                  )}
                </div>
              </Card>
            </motion.li>
          ))}
        </ol>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold">Degree requirements</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {plan.requirements.map((r) => (
            <li key={r.id} className="flex items-start gap-3">
              {r.satisfied ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted" />
              )}
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted">
                  {r.fulfilledBy.join(", ")}
                  {!r.satisfied && (
                    <span className="text-danger">
                      {r.fulfilledBy.length > 0 && " · "}
                      {r.detail}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold">Why this plan</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{plan.electiveStrategy}</p>
        {(errors.length > 0 || warnings.length > 0 || plan.risks.length > 0) && (
          <>
            <h4 className="mt-5 text-sm font-semibold">Things to double-check</h4>
            <ul className="mt-2 grid gap-2">
              {[...errors, ...warnings].map((i, idx) => (
                <li
                  key={`i${idx}`}
                  className={clsx("flex gap-2 text-sm", i.severity === "error" ? "text-danger" : "text-warning")}
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {i.message}
                </li>
              ))}
              {plan.risks.map((r, idx) => (
                <li key={`r${idx}`} className="flex gap-2 text-sm text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted" />
                  {r}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Button variant="secondary" className="no-print justify-self-center" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        Edit my answers
      </Button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-xl bg-primary-soft px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={clsx(
          "text-lg font-semibold tabular-nums text-primary-ink",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CourseRow({ course }: { course: PlannedCourse }) {
  const [open, setOpen] = useState(false);
  const top = course.professors[0];
  return (
    <div className="rounded-xl border border-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left" aria-expanded={open}>
        <span className="w-16 shrink-0 font-mono text-xs font-medium text-primary-ink">{course.code}</span>
        <span className="min-w-0 flex-1 text-sm font-medium">{course.title}</span>
        {top && (
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex">
            <Star className="size-3 fill-current text-secondary" />
            <Rating value={top.rating} /> {top.name}
          </span>
        )}
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border px-3 py-3 text-sm">
          <p className="leading-relaxed text-muted">{course.reason}</p>
          <p className="text-xs text-muted">Usually offered: {course.offered.join(", ")}</p>
          {course.professors.length > 0 ? (
            <ul className="grid gap-1.5">
              {course.professors.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {p.name} {p.sample && <span className="font-normal text-muted">(sample data)</span>}
                  </span>
                  <span className="text-muted">
                    <Rating value={p.rating} label="Rating" /> rating · {p.difficulty.toFixed(1)} difficulty
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No instructor data for this term yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Courses as nodes (colored by the requirement they fulfil), prerequisites as links, columns = terms. */
function planGraph(plan: DegreePlan): { nodes: GraphNode[]; links: GraphLink[]; groups: string[] } {
  const requirementOf = new Map<string, string>();
  for (const r of plan.requirements) for (const c of r.fulfilledBy) requirementOf.set(c, r.name);

  const nodes: GraphNode[] = [];
  const planned = new Set<string>();
  plan.terms.forEach((t, column) => {
    for (const c of t.courses) {
      planned.add(c.code);
      nodes.push({ id: c.code, label: c.title, group: requirementOf.get(c.code) ?? "Other", subtitle: t.term, column: column + 1 });
    }
  });

  const links: GraphLink[] = [];
  for (const t of plan.terms) {
    for (const c of t.courses) {
      for (const pre of c.prerequisites) {
        if (!planned.has(pre) && !nodes.some((n) => n.id === pre)) {
          nodes.push({ id: pre, label: "Completed before this plan", group: "Completed", column: 0, muted: true });
        }
        links.push({ source: pre, target: c.code });
      }
    }
  }
  return { nodes, links, groups: [...plan.requirements.map((r) => r.name), "Other", "Completed"] };
}
