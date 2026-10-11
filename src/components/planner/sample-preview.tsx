import { CheckCircle2, ShieldCheck, Star } from "lucide-react";

const TERMS = [
  {
    term: "Spring 2027",
    courses: [
      { code: "CS 5010", title: "Programming Design Paradigm", prof: "A. Chen", rating: 4.6 },
      { code: "CS 5800", title: "Algorithms", prof: "J. Patel", rating: 3.9 },
    ],
  },
  {
    term: "Fall 2027",
    courses: [
      { code: "CS 6650", title: "Scalable Distributed Systems", prof: "T. Brooks", rating: 4.4 },
      { code: "CS 5200", title: "Database Management Systems", prof: "D. Kim", rating: 4.3 },
    ],
  },
];

/** Static illustration of a generated roadmap, shown beside the hero form. */
export function SamplePreview() {
  return (
    <div className="grid grid-cols-1 gap-4" aria-hidden>
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xl shadow-primary/15">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">MS in Computer Science</p>
            <p className="font-display text-xl font-semibold">Your roadmap</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-ink">
            <CheckCircle2 className="size-3.5" /> 32 credits
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {TERMS.map((t) => (
            <div key={t.term} className="rounded-2xl bg-surface-muted p-3">
              <p className="mb-2 text-xs font-semibold text-muted">{t.term}</p>
              <div className="grid grid-cols-1 gap-2">
                {t.courses.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2 shadow-sm">
                    <span className="font-mono text-xs font-medium text-primary-ink">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Star className="size-3 fill-secondary text-secondary" />
                      {c.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { icon: ShieldCheck, title: "Prerequisites checked", text: "Offered every term you need it" },
          { icon: Star, title: "Top-rated professors", text: "Reviews for every course" },
        ].map((b) => (
          <div key={b.title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg shadow-primary/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary-ink">
              <b.icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{b.title}</p>
              <p className="text-xs text-muted">{b.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
