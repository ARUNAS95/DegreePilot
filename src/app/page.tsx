import { cacheLife } from "next/cache";
import Link from "next/link";
import { ArrowRight, Bot, CalendarCheck, Check, GraduationCap, MessageSquareText, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Planner } from "@/components/planner/planner";
import type { FormOptions } from "@/components/planner/plan-form";
import { SamplePreview } from "@/components/planner/sample-preview";
import { upcomingStartTerms } from "@/lib/terms";
import { listUniversities, loadCatalog } from "@/lib/universities";

async function homeData() {
  "use cache";
  cacheLife("days");
  const universities = listUniversities();
  const catalogs = await Promise.all(universities.map((u) => loadCatalog(u.id)));
  const options: FormOptions = {
    universities: universities.map(({ id, name, dataNote }) => ({ id, name, dataNote })),
    programs: Object.fromEntries(
      catalogs.map((c) => [
        c.adapter.info.id,
        c.programs.map(({ id, name, level, totalCredits, description }) => ({ id, name, level, totalCredits, description })),
      ]),
    ),
    courses: Object.fromEntries(
      catalogs.map((c) => [c.adapter.info.id, c.courses.map(({ code, title }) => ({ code, title }))]),
    ),
    startTerms: upcomingStartTerms(new Date(), 5),
  };
  const stats = {
    courses: catalogs.reduce((n, c) => n + c.courses.length, 0),
    programs: catalogs.reduce((n, c) => n + c.programs.length, 0),
    professors: catalogs.reduce((n, c) => n + c.professors.length, 0),
  };
  return { options, stats };
}

const BENEFITS = [
  "Meets every degree requirement",
  "Prerequisites and term offerings checked",
  "Professor ratings and reviews for each course",
];

const STEPS = [
  { icon: GraduationCap, title: "Choose your program", text: "Graduate or undergraduate: pick your university, degree and start term." },
  { icon: MessageSquareText, title: "Describe your goal", text: "A sentence about the career, topics or workload you want." },
  { icon: Sparkles, title: "Get your roadmap", text: "A checked, term-by-term plan you can take to registration." },
];

const GET = [
  { icon: CalendarCheck, title: "What to take, and when", text: "Each course placed in a term where it's offered, with co-op terms left free." },
  { icon: ShieldCheck, title: "No registration surprises", text: "Prerequisites, credit limits and degree requirements are validated automatically." },
  { icon: Star, title: "Who to take it with", text: "Professors for each course with ratings, difficulty and student reviews." },
  { icon: Bot, title: "Works with AI assistants", text: "Plan from Claude or any MCP client using DegreePilot's tools." },
];

export default async function Home() {
  const { options, stats } = await homeData();
  return (
    <div>
      <Planner
        options={options}
        intro={
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary-soft px-3 py-1 text-xs font-semibold text-secondary-ink">
              <GraduationCap className="size-3.5" /> AI course planner for university students
            </span>
            <h1 className="text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-[3.4rem]">
              Know exactly which courses to take, <span className="text-primary italic">every semester.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Course registration is confusing. DegreePilot turns your career goal into a semester-by-semester plan for
              your degree, in about 30 seconds.
            </p>
            <ul className="mt-7 grid gap-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="font-medium">{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-muted">
              For <span className="font-semibold text-foreground">undergraduate and graduate</span> students at{" "}
              <span className="font-semibold text-foreground">Northeastern University</span> · more universities coming
              soon
            </p>
          </div>
        }
      />

      <section className="border-y border-border bg-surface">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
          {[
            [stats.courses, "Courses in the catalog"],
            [stats.programs, "Degree programs"],
            [stats.professors, "Professors with reviews"],
            ["~30 sec", "To build your plan"],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <dt className="font-display text-3xl font-semibold text-primary">{value}</dt>
              <dd className="mt-1 text-sm text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <p className="text-center text-sm font-semibold tracking-wide text-secondary-ink uppercase">How it works</p>
        <h2 className="mt-2 text-center text-3xl font-semibold sm:text-4xl">Three steps to a registration-ready plan</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-3xl border border-border bg-surface p-6">
              <span className="absolute top-6 right-6 font-display text-5xl font-semibold text-primary-soft">{i + 1}</span>
              <span className="grid size-11 place-items-center rounded-2xl bg-primary text-white">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="overflow-hidden bg-surface py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-secondary-ink uppercase">What you&apos;ll get</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Everything registration week needs, in one place</h2>
            <p className="mt-3 text-muted">No more juggling the catalog, your degree audit, review sites and a spreadsheet.</p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {GET.map((f) => (
                <li key={f.title}>
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <SamplePreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-white sm:px-12">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-secondary/30 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold">Registration opens soon. Be ready.</h2>
              <p className="mt-2 max-w-lg text-white/85">Build your plan now, then take it to your advisor.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#plan" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-primary-ink hover:bg-white/90">
                Plan my degree <ArrowRight className="size-4" />
              </a>
              <Link href="/catalog" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-semibold hover:bg-white/10">
                Browse courses
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted">{options.universities[0]?.dataNote}</p>
      </section>
    </div>
  );
}
