import { Card } from "@/components/ui";

export const metadata = { title: "MCP server - DegreePilot" };

const TOOLS = [
  ["list_universities", "Universities with course data"],
  ["list_programs", "Degree programs and their requirement structure"],
  ["search_courses", "Search the catalog and reviews by topic (the same retriever the planner uses)"],
  ["get_course", "Prerequisites, offered seasons and instructors for a course"],
  ["get_professor_reviews", "Ratings, tags and reviews for a professor"],
  ["validate_plan", "Check a plan for prerequisite, availability, credit and requirement problems"],
  ["generate_degree_plan", "Run the full LangGraph planner and return a validated plan"],
];

export default function McpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Use DegreePilot from any AI assistant</h1>
      <p className="mt-3 text-muted">
        DegreePilot runs a Model Context Protocol server at <code className="font-mono text-foreground">/api/mcp</code>{" "}
        (Streamable HTTP). Connect it to Claude Desktop, Claude Code, Cursor or any MCP client, then ask things like
        &ldquo;plan my MS CS at Northeastern for a backend career&rdquo;.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold">Claude Code</h2>
      <Card className="p-4">
        <pre className="overflow-x-auto font-mono text-sm">
          claude mcp add --transport http degreepilot https://YOUR-DEPLOYMENT.vercel.app/api/mcp
        </pre>
      </Card>

      <h2 className="mt-8 mb-3 text-xl font-semibold">Claude Desktop / stdio clients</h2>
      <Card className="p-4">
        <pre className="overflow-x-auto font-mono text-sm">{`{
  "mcpServers": {
    "degreepilot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-DEPLOYMENT.vercel.app/api/mcp"]
    }
  }
}`}</pre>
      </Card>

      <h2 className="mt-8 mb-3 text-xl font-semibold">Tools</h2>
      <Card className="divide-y divide-border">
        {TOOLS.map(([name, desc]) => (
          <div key={name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
            <code className="font-mono text-sm text-primary-ink sm:w-56">{name}</code>
            <span className="text-sm text-muted">{desc}</span>
          </div>
        ))}
      </Card>
      <p className="mt-4 text-sm text-muted">
        There&apos;s also a <code className="font-mono">plan_my_degree</code> prompt that walks the assistant through
        searching, drafting and validating a plan.
      </p>
    </div>
  );
}
