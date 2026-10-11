"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DegreePlan, PlannerInput } from "@/lib/types";
import { PlanForm, type FormOptions } from "./plan-form";
import { PipelineProgress, type Step } from "./pipeline-progress";
import { PlanView } from "./plan-view";

/** Hero (explanation left, guided form right) followed by live progress and the generated plan. */
export function Planner({ options, intro }: { options: FormOptions; intro: ReactNode }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [plan, setPlan] = useState<DegreePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function run(input: PlannerInput) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setPlan(null);
    setError(null);
    setSteps([]);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      for await (const { event, data } of readSSE(res.body)) {
        if (event === "step") setSteps((s) => [...s, data as Step]);
        else if (event === "plan") setPlan(data as DegreePlan);
        else if (event === "error") setError((data as { message: string }).message);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const hasResults = running || steps.length > 0 || !!error || !!plan;
  return (
    <>
      <section className="hero-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-14">
          {intro}
          <PlanForm options={options} running={running} onSubmit={run} />
        </div>
      </section>
      <div ref={resultsRef} className={hasResults ? "mx-auto max-w-4xl scroll-mt-20 px-4 pb-16" : "scroll-mt-20"}>
        <AnimatePresence mode="wait">
          {(running || steps.length > 0 || error) && !plan && (
            <motion.div key="progress" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PipelineProgress steps={steps} running={running} error={error} />
            </motion.div>
          )}
          {plan && (
            <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PlanView plan={plan} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

async function* readSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = raw.match(/^event: (.*)$/m)?.[1] ?? "message";
      const data = raw.match(/^data: (.*)$/m)?.[1];
      if (data) yield { event, data: JSON.parse(data) as unknown };
    }
  }
}
