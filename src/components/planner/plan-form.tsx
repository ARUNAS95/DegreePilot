"use client";

import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowRight, Briefcase, ChevronDown, Loader2, Plus, X } from "lucide-react";
import type { Level, PlannerInput } from "@/lib/types";
import { buildTerms } from "@/lib/terms";
import { Card, Label, inputClass } from "@/components/ui";

export interface FormOptions {
  universities: { id: string; name: string; dataNote: string }[];
  programs: Record<string, { id: string; name: string; level: Level; totalCredits: number; description: string }[]>;
  courses: Record<string, { code: string; title: string }[]>;
  startTerms: string[];
}

const EXAMPLES = [
  { label: "Backend engineer", text: "I want to become a backend / distributed systems engineer at a big tech company. Strong in Java, weaker in math." },
  { label: "ML / LLM engineer", text: "I'm aiming for ML engineer roles working with LLMs and NLP. I want research exposure and a lighter first semester." },
  { label: "Switch to web dev", text: "Career switcher from mechanical engineering. Want a full-stack web role, prefer practical project-based courses." },
];

// Typical full-time loads: graduate students take 2 courses, undergraduates 4.
const LEVELS: Record<Level, { label: string; loads: number[]; defaultLoad: number; defaultTerms: number }> = {
  graduate: { label: "Graduate", loads: [4, 8, 12], defaultLoad: 8, defaultTerms: 4 },
  undergraduate: { label: "Undergraduate", loads: [12, 16, 20], defaultLoad: 16, defaultTerms: 8 },
};

const isGradCourse = (code: string) => Number(code.split(" ")[1]) >= 5000;

const selectClass = clsx(inputClass, "h-11 cursor-pointer appearance-none pr-9");

function Select({ id, value, onChange, children }: { id: string; value: string | number; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

function StepHeading({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-white">{n}</span>
      <div>
        <p className="font-semibold leading-7">{title}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
    </div>
  );
}

export function PlanForm({
  options,
  running,
  onSubmit,
}: {
  options: FormOptions;
  running: boolean;
  onSubmit: (input: PlannerInput) => void;
}) {
  // A single select covers university + program: "neu/ms-cs".
  const allChoices = options.universities.flatMap((u) =>
    (options.programs[u.id] ?? []).map((p) => ({ value: `${u.id}/${p.id}`, university: u, program: p })),
  );
  const [level, setLevel] = useState<Level>("graduate");
  const programChoices = allChoices.filter((c) => c.program.level === level);
  const [choice, setChoice] = useState(programChoices[0]?.value ?? "");
  const [universityId, programId] = choice.split("/");
  const courses = (options.courses[universityId] ?? []).filter((c) => isGradCourse(c.code) === (level === "graduate"));
  const levelConfig = LEVELS[level];

  const [goals, setGoals] = useState("");
  const [startTerm, setStartTerm] = useState(options.startTerms[0]);
  const [numTerms, setNumTerms] = useState(levelConfig.defaultTerms);
  const [showMore, setShowMore] = useState(false);
  const [includeSummer, setIncludeSummer] = useState(false);
  const [maxCredits, setMaxCredits] = useState(levelConfig.defaultLoad);

  function changeLevel(next: Level) {
    setLevel(next);
    setChoice(allChoices.find((c) => c.program.level === next)?.value ?? "");
    setNumTerms(LEVELS[next].defaultTerms);
    setMaxCredits(LEVELS[next].defaultLoad);
    setCompleted([]);
  }
  const [completed, setCompleted] = useState<string[]>([]);
  const [coopTerms, setCoopTerms] = useState<string[]>([]);
  const [courseQuery, setCourseQuery] = useState("");

  const terms = useMemo(() => buildTerms(startTerm, numTerms, includeSummer), [startTerm, numTerms, includeSummer]);
  const extras = completed.length + coopTerms.filter((t) => terms.includes(t)).length + (includeSummer ? 1 : 0) + (maxCredits !== levelConfig.defaultLoad ? 1 : 0);
  const courseMatches = courseQuery
    ? courses
        .filter((c) => !completed.includes(c.code) && `${c.code} ${c.title}`.toLowerCase().includes(courseQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (running || !choice) return;
    onSubmit({
      universityId,
      programId,
      goals,
      completedCourses: completed,
      startTerm,
      numTerms,
      includeSummer,
      maxCreditsPerTerm: maxCredits,
      coopTerms: coopTerms.filter((t) => terms.includes(t)),
    });
  }

  return (
    <Card id="plan" className="no-print scroll-mt-24 p-6 shadow-2xl shadow-primary/10 sm:p-7">
      <form onSubmit={submit} className="grid gap-7">
        <section>
          <StepHeading n={1} title="Choose your program" hint="We'll load its degree requirements and courses." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Level</Label>
              <div role="radiogroup" aria-label="Level" className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
                {(Object.keys(LEVELS) as Level[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={level === l}
                    onClick={() => changeLevel(l)}
                    className={clsx(
                      "rounded-lg text-sm font-semibold transition",
                      level === l ? "bg-surface text-primary-ink shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground",
                    )}
                  >
                    {LEVELS[l].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="program">University & program</Label>
              <Select id="program" value={choice} onChange={(v) => { setChoice(v); setCompleted([]); }}>
                {options.universities
                  .filter((u) => programChoices.some((c) => c.university.id === u.id))
                  .map((u) => (
                  <optgroup key={u.id} label={u.name}>
                    {programChoices
                      .filter((c) => c.university.id === u.id)
                      .map((c) => (
                        <option key={c.value} value={c.value}>
                          {u.name} · {c.program.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="start">Starting term</Label>
              <Select id="start" value={startTerm} onChange={setStartTerm}>
                {options.startTerms.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="terms">Terms to plan</Label>
              <Select id="terms" value={numTerms} onChange={(v) => setNumTerms(Number(v))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "term" : "terms"}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section>
          <StepHeading n={2} title="Describe your goal" hint="Career, interests, workload. A sentence or two is enough." />
          <label htmlFor="goals" className="sr-only">
            Your goal
          </label>
          <textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            placeholder="e.g. I want a backend engineering role at a big tech company and prefer project-based courses."
            className={clsx(inputClass, "resize-none leading-relaxed")}
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Or start from:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setGoals(ex.text)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  goals === ex.text
                    ? "border-primary bg-primary-soft text-primary-ink"
                    : "border-border bg-surface text-muted hover:border-primary hover:text-primary-ink",
                )}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        <div className="rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            className="flex h-11 w-full items-center justify-between px-4 text-left text-sm"
          >
            <span className="font-medium">
              Optional details
              <span className="ml-2 font-normal text-muted">
                {extras ? `${extras} added` : "courses taken, co-op, course load"}
              </span>
            </span>
            <ChevronDown className={clsx("size-4 text-muted transition", showMore && "rotate-180")} />
          </button>

          {showMore && (
            <div className="grid gap-5 border-t border-border p-4">
              <div>
                <Label hint="Waived or already taken">Courses you&apos;ve completed</Label>
                <div className="relative">
                  <input
                    value={courseQuery}
                    onChange={(e) => setCourseQuery(e.target.value)}
                    placeholder="Search e.g. CS 5010 or Algorithms"
                    className={clsx(inputClass, "h-11")}
                  />
                  {courseMatches.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                      {courseMatches.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCompleted((x) => [...x, c.code]);
                            setCourseQuery("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        >
                          <Plus className="size-3.5 text-muted" />
                          <span className="font-mono text-xs text-muted">{c.code}</span>
                          {c.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {completed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {completed.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary-ink">
                        {c}
                        <button type="button" onClick={() => setCompleted((x) => x.filter((y) => y !== c))} aria-label={`Remove ${c}`}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Courses per term</Label>
                  <div className="grid h-11 grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
                    {levelConfig.loads.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMaxCredits(c)}
                        className={clsx(
                          "rounded-lg text-sm font-medium transition",
                          maxCredits === c ? "bg-primary text-white" : "text-muted hover:text-foreground",
                        )}
                      >
                        {c / 4}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Summer</Label>
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={includeSummer}
                      onChange={(e) => setIncludeSummer(e.target.checked)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    Take classes in summer
                  </label>
                </div>
              </div>

              <div>
                <Label hint="Tap the terms you'll be on co-op">Co-op terms</Label>
                <div className="flex flex-wrap gap-1.5">
                  {terms.map((t) => {
                    const coop = coopTerms.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCoopTerms((x) => (coop ? x.filter((y) => y !== t) : [...x, t]))}
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                          coop ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary hover:text-primary-ink",
                        )}
                      >
                        {coop && <Briefcase className="size-3" />}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={running || !choice}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover disabled:opacity-70"
          >
            {running ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Building your roadmap...
              </>
            ) : (
              <>
                Generate my roadmap <ArrowRight className="size-5" />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Free · takes about 30 seconds · no sign-up</p>
        </div>
      </form>
    </Card>
  );
}
