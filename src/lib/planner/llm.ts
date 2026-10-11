import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import Groq from "groq-sdk";
import { z } from "zod";

type Provider = "anthropic" | "groq";
type Effort = "low" | "medium" | "high";

interface StructuredOptions<S extends z.ZodType> {
  schema: S;
  system: string;
  prompt: string;
  effort: Effort;
  maxTokens?: number;
}

/**
 * LLM_PROVIDER picks the backend explicitly; otherwise use Claude when an
 * Anthropic key is configured and fall back to Groq's free tier.
 */
export const PROVIDER: Provider =
  (process.env.LLM_PROVIDER as Provider | undefined) ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : "groq");

export const MODEL =
  process.env.LLM_MODEL ?? (PROVIDER === "anthropic" ? "claude-opus-5-5" : "openai/gpt-oss-120b");

/** Returns a human-readable problem if the selected provider isn't configured. */
export function llmConfigError(): string | null {
  if (PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY) return "Set ANTHROPIC_API_KEY on the server.";
  if (PROVIDER === "groq" && !process.env.GROQ_API_KEY) return "Set GROQ_API_KEY on the server.";
  if (PROVIDER !== "anthropic" && PROVIDER !== "groq") return `Unknown LLM_PROVIDER "${PROVIDER}".`;
  return null;
}

/** One structured-output call; the result is validated against the zod schema. */
export function structured<S extends z.ZodType>(opts: StructuredOptions<S>): Promise<z.infer<S>> {
  return PROVIDER === "anthropic" ? viaClaude(opts) : viaGroq(opts);
}

let anthropic: Anthropic | undefined;
let groq: Groq | undefined;

async function viaClaude<S extends z.ZodType>(opts: StructuredOptions<S>): Promise<z.infer<S>> {
  anthropic ??= new Anthropic();
  // If a safety classifier declines, `fallbacks: "default"` retries on
  // Anthropic's recommended fallback model.
  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude ran out of output tokens before finishing the plan.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude returned output that did not match the expected schema.");
  }
  return response.parsed_output as z.infer<S>;
}

async function viaGroq<S extends z.ZodType>(opts: StructuredOptions<S>): Promise<z.infer<S>> {
  groq ??= new Groq();
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_completion_tokens: opts.maxTokens ?? 16000,
    reasoning_effort: opts.effort,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "output", strict: true, schema: z.toJSONSchema(opts.schema) as Record<string, unknown> },
    },
  });

  const choice = response.choices[0];
  if (choice?.finish_reason === "length") {
    throw new Error("The model ran out of output tokens before finishing the plan.");
  }
  const parsed = opts.schema.safeParse(JSON.parse(choice?.message.content ?? "null"));
  if (!parsed.success) throw new Error("The model returned output that did not match the expected schema.");
  return parsed.data as z.infer<S>;
}
