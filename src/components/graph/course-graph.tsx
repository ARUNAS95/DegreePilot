"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export interface GraphNode {
  id: string; // course code
  label: string; // course title
  group: string; // legend category (requirement, subject...)
  subtitle?: string; // e.g. the term it's planned in
  column?: number; // left-to-right position (term index, course level...)
  muted?: boolean; // e.g. already completed
}

export interface GraphLink {
  source: string; // prerequisite
  target: string; // course that requires it
}

/**
 * Categorical node colors, stepped for the dark graph surface (#1e1e24) and
 * validated for colorblind separation. Assigned in fixed order, never cycled.
 */
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"];
export const MUTED_GROUP = "#5c5c6b";

const ForceGraphCanvas = dynamic(() => import("./force-graph-canvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-[#a0a0b0]">
      <Loader2 className="size-5 animate-spin" />
    </div>
  ),
});

/** Legend + Obsidian-style graph. `groups` sets legend order and color slots. */
export function CourseGraph({
  nodes,
  links,
  groups,
  mutedGroups = [],
  height = 460,
  caption,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  groups: string[];
  mutedGroups?: string[];
  height?: number;
  caption?: string;
}) {
  const colors: Record<string, string> = {};
  let slot = 0;
  for (const g of groups) {
    colors[g] = mutedGroups.includes(g) ? MUTED_GROUP : SERIES[Math.min(slot++, SERIES.length - 1)];
  }
  const present = groups.filter((g) => nodes.some((n) => n.group === g));

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2c2c36] bg-[#1e1e24]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#2c2c36] px-4 py-3">
        {present.map((g) => (
          <span key={g} className="flex items-center gap-1.5 text-xs text-[#c9c9d6]">
            <span className="size-2.5 rounded-full" style={{ background: colors[g], boxShadow: `0 0 6px ${colors[g]}` }} />
            {g}
          </span>
        ))}
        <span className="ml-auto text-xs text-[#8b8b9a]">{caption ?? "Hover a course to trace its prerequisites · drag · scroll to zoom"}</span>
      </div>
      <div style={{ height }}>
        <ForceGraphCanvas nodes={nodes} links={links} colors={colors} height={height} />
      </div>
    </div>
  );
}
