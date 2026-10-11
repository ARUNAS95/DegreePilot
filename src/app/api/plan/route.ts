import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { initialState, plannerGraph } from "@/lib/planner/graph";
import { llmConfigError } from "@/lib/planner/llm";
import { PlannerInputSchema } from "@/lib/planner/input";

export const maxDuration = 300;

const STEP_LABELS: Record<string, string> = {
  understand: "Understanding your goals",
  retrieve: "Searching the catalog (RAG)",
  draftPlan: "Drafting your roadmap with AI",
  validate: "Checking prerequisites & availability",
  enrich: "Adding professors & requirement progress",
};

/** Streams LangGraph node updates to the browser as server-sent events. */
export async function POST(request: Request) {
  const configError = llmConfigError();
  if (configError) {
    return Response.json({ error: `The planner isn't configured yet: ${configError}` }, { status: 503 });
  }
  const parsed = PlannerInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const updates = await plannerGraph.stream(initialState(parsed.data), {
          streamMode: "updates",
          signal: request.signal,
        });
        for await (const chunk of updates) {
          for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
            const detail =
              node === "understand"
                ? update.profile
                : node === "retrieve"
                  ? { candidates: update.candidates }
                  : node === "draftPlan"
                    ? { attempt: update.attempts }
                    : node === "validate"
                      ? { errors: (update.issues as { severity: string }[]).filter((i) => i.severity === "error").length }
                      : undefined;
            send("step", { node, label: STEP_LABELS[node] ?? node, detail });
            if (node === "enrich") send("plan", update.plan);
          }
        }
        send("done", {});
      } catch (err) {
        console.error("planner failed", err);
        send("error", { message: errorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const body = err.error as { error?: { message?: string } } | undefined;
    return `Claude API error: ${body?.error?.message ?? err.message}`;
  }
  if (err instanceof Groq.APIError) {
    const body = err.error as { error?: { message?: string } } | undefined;
    return `Groq API error: ${body?.error?.message ?? err.message}`;
  }
  return err instanceof Error ? err.message : "Planner failed";
}
