"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { forceCollide, forceX, forceY } from "d3-force";
import type { GraphLink, GraphNode } from "./course-graph";

type Node = GraphNode & { x?: number; y?: number };
type Link = { source: string | Node; target: string | Node };

const SURFACE = "#1e1e24";
const idOf = (end: string | Node) => (typeof end === "string" ? end : end.id);

/**
 * Obsidian-style force graph: glowing nodes, faint links, and hover that
 * lights up a course's whole prerequisite chain while dimming the rest.
 * `column` (when present) pulls nodes left-to-right so the graph reads like a tree.
 */
export default function ForceGraphCanvas({
  nodes,
  links,
  colors,
  height,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  colors: Record<string, string>;
  height: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<Node, Link> | undefined>(undefined);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  // Fresh objects per data change: the simulation mutates nodes/links in place.
  const data = useMemo(
    () => ({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) }),
    [nodes, links],
  );

  const { prereqs, unlocks, degree } = useMemo(() => {
    const prereqs = new Map<string, string[]>();
    const unlocks = new Map<string, string[]>();
    const degree = new Map<string, number>();
    for (const l of links) {
      prereqs.set(l.target, [...(prereqs.get(l.target) ?? []), l.source]);
      unlocks.set(l.source, [...(unlocks.get(l.source) ?? []), l.target]);
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    return { prereqs, unlocks, degree };
  }, [links]);

  // Everything upstream (prerequisites) and downstream (what it unlocks) of the hovered node.
  const lit = useMemo(() => {
    if (!hover) return null;
    const seen = new Set([hover]);
    const walk = (id: string, edges: Map<string, string[]>) => {
      for (const next of edges.get(id) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          walk(next, edges);
        }
      }
    };
    walk(hover, prereqs);
    walk(hover, unlocks);
    return seen;
  }, [hover, prereqs, unlocks]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !width) return;
    const columns = Math.max(...nodes.map((n) => n.column ?? 0)) + 1;
    const spacing = Math.min(140, (width * 0.8) / Math.max(columns, 1));
    const offset = ((columns - 1) * spacing) / 2;
    if (nodes.some((n) => n.column !== undefined)) {
      fg.d3Force("x", forceX<Node>((n) => (n.column ?? 0) * spacing - offset).strength(0.6));
    }
    // Keep unconnected courses (writing, math...) from drifting off-screen.
    fg.d3Force("y", forceY<Node>(0).strength(0.12));
    fg.d3Force("collide", forceCollide<Node>(18));
    fg.d3Force("charge")?.strength?.(-60);
    fg.d3Force("link")?.distance?.(50);
    fg.d3ReheatSimulation();
  }, [nodes, width]);

  const radius = (n: Node) => 4 + Math.min(degree.get(n.id) ?? 0, 6) * 0.9;

  return (
    <div ref={wrapRef} className="w-full" style={{ height }}>
      {width > 0 && (
        <ForceGraph2D<Node, Link>
          ref={fgRef}
          width={width}
          height={height}
          graphData={data}
          backgroundColor={SURFACE}
          cooldownTicks={120}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
          linkColor={(l) =>
            lit && lit.has(idOf(l.source!)) && lit.has(idOf(l.target!)) ? "rgba(236,236,244,0.75)" : lit ? "rgba(236,236,244,0.05)" : "rgba(236,236,244,0.18)"
          }
          linkWidth={(l) => (lit && lit.has(idOf(l.source!)) && lit.has(idOf(l.target!)) ? 1.6 : 0.8)}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={0.92}
          nodeLabel={(n) =>
            `<div class="graph-tip"><b>${n.id}</b> ${n.label}<br/><span>${[n.subtitle, n.group].filter(Boolean).join(" · ")}</span></div>`
          }
          onNodeHover={(n) => setHover(n?.id ?? null)}
          nodePointerAreaPaint={(n, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, radius(n) + 4, 0, 2 * Math.PI);
            ctx.fill();
          }}
          nodeCanvasObject={(n, ctx, scale) => {
            const r = radius(n);
            const dim = lit && !lit.has(n.id);
            const color = colors[n.group] ?? "#8b8b9a";
            ctx.globalAlpha = dim ? 0.15 : 1;
            ctx.shadowColor = color;
            ctx.shadowBlur = dim ? 0 : hover === n.id ? 22 : 10;
            ctx.fillStyle = n.muted ? "#5c5c6b" : color;
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (hover === n.id) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5 / scale;
              ctx.stroke();
            }
            // Labels fade in as you zoom, and always show for the lit chain.
            if (nodes.length <= 60 || scale > 1.1 || (lit && lit.has(n.id))) {
              const size = 11 / scale; // constant 11px on screen at any zoom
              ctx.font = `500 ${size}px var(--font-dm-sans), sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = dim ? "rgba(236,236,244,0.3)" : "rgba(236,236,244,0.92)";
              ctx.fillText(n.id, n.x!, n.y! + r + 2);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
    </div>
  );
}
