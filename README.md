# DegreePilot
https://degree-pilot-eight.vercel.app/

AI degree planner. Describe your goals and DegreePilot builds a semester-by-semester course roadmap that meets your degree requirements, respects prerequisites and the terms each course is offered, and shows who teaches each course along with their reviews.

Northeastern University (Khoury MS CS and MS AI) is supported first. New universities plug in through a single adapter interface.

## Stack

| Layer | Tech |
| --- | --- |
| App | Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS v4, Framer Motion |
| AI | Pluggable LLM layer with zod-validated structured outputs: Groq (`openai/gpt-oss-120b`, free tier) or Claude (`claude-opus-5-5`) via the official SDKs |
| Orchestration | LangGraph.js state graph with a validate-and-repair loop |
| Retrieval (RAG) | MiniSearch BM25 index over the course catalog and professor reviews |
| Tools | Model Context Protocol server (`mcp-handler`, Streamable HTTP) at `/api/mcp` |
| Tests | Vitest |
| Hosting | Vercel |

## How the planner works

```
 goals ─▶ understand ─▶ retrieve ─▶ draftPlan ─▶ validate ──ok──▶ enrich ─▶ plan
          (LLM)         (RAG)       (LLM)        (rules)            (catalog)
                                       ▲            │
                                       └──errors────┘  (up to 3 attempts)
```

1. **understand**: the LLM turns free-text goals into a structured profile (interests, search queries, workload preference).
2. **retrieve**: the RAG retriever searches courses and reviews for each query and ranks the candidate electives.
3. **draftPlan**: the LLM drafts the plan from the requirements, the term list, the full catalog and the retrieved context.
4. **validate**: deterministic checks for catalog existence, prerequisites in earlier terms, the season each course is offered, credit limits, co-op terms, repeated courses and degree requirements. If anything fails, the errors are fed back to the LLM to repair the plan.
5. **enrich**: adds professors for each term, their ratings and requirement progress.

Progress streams to the UI over server-sent events (`POST /api/plan`).

## MCP server

`/api/mcp` exposes `list_universities`, `list_programs`, `search_courses`, `get_course`, `get_professor_reviews`, `validate_plan` and `generate_degree_plan`, plus a `plan_my_degree` prompt.

```bash
claude mcp add --transport http degreepilot http://localhost:3000/api/mcp
```

## Run locally

```bash
npm install
cp .env.example .env.local   # add GROQ_API_KEY (free) and/or ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # validator + LangGraph tests (LLM is mocked)
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. The framework is detected as Next.js automatically.
3. Add the environment variables `LLM_PROVIDER=groq` and `GROQ_API_KEY`. To switch to Claude later, set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.
4. Deploy. The planner and MCP routes set `maxDuration = 300` for long LLM calls.

## Adding a university

Implement `UniversityAdapter` (`src/lib/universities/types.ts`) with courses, programs and professors from static data, a scraper or a registrar API, then register it in `src/lib/universities/index.ts`. The planner, RAG index, validator, UI and MCP tools pick it up automatically.

## Data disclaimer

Course titles follow the public Northeastern catalog. Offering patterns are approximate, the degree requirements are simplified models, and **professor names and reviews are demo data**. DegreePilot is a planning aid, not an official degree audit.

## Roadmap

- Live term offerings from Banner / SearchNEU
- Student-submitted reviews (Postgres) and saved plans with auth
- Vector embeddings (pgvector) alongside BM25 for hybrid retrieval
- Degree-audit PDF upload to auto-fill completed courses
- More universities
