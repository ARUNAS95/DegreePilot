"use client";

import clsx from "clsx";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui";

export interface Step {
  node: string;
  label: string;
  detail?: Record<string, unknown>;
}

const PIPELINE = [
  { node: "understand", label: "Understanding your goals" },
  { node: "retrieve", label: "Finding matching courses" },
  { node: "draftPlan", label: "Drafting your roadmap" },
  { node: "validate", label: "Checking prerequisites & availability" },
  { node: "enrich", label: "Adding professors & requirements" },
];

export function PipelineProgress({ steps, running, error }: { steps: Step[]; running: boolean; error: string | null }) {
  const last = steps.at(-1);
  const retrying = last?.node === "validate" && Number(last.detail?.errors) > 0;
  // Index of the step currently running; a failed validation sends us back to drafting.
  const current = retrying ? 2 : last ? PIPELINE.findIndex((p) => p.node === last.node) + 1 : 0;
  const attempts = steps.filter((s) => s.node === "draftPlan").length;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold">Building your roadmap</h2>
      <p className="text-sm text-muted">Usually takes under a minute.</p>
      <ol className="mt-5 grid gap-3">
        {PIPELINE.map((p, i) => {
          const done = i < current;
          const active = running && !error && i === current;
          return (
            <li key={p.node} className="flex items-center gap-3">
              <span
                className={clsx(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  done ? "bg-primary text-white" : active ? "bg-secondary text-foreground" : "bg-surface-muted text-muted",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </span>
              <span className={clsx("text-sm", done || active ? "font-medium text-foreground" : "text-muted")}>
                {p.label}
                {p.node === "draftPlan" && attempts > 1 && (
                  <span className="ml-2 text-xs font-normal text-muted">fixing issues, attempt {attempts}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
    </Card>
  );
}
