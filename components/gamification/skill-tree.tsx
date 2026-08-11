"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { GitFork } from "lucide-react";

import { getSkillTree } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";

/* ------------------------------------------------------------------ */
/*  Skill tree — d3 tree layout over the category-XP projection (§6).  */
/*  Pure read-projection: only category-level XP feeds it. */
/* ------------------------------------------------------------------ */

interface TreeNodeDatum {
  name: string;
  xp?: number;
  progress?: number;
  children?: TreeNodeDatum[];
}

const WIDTH = 720;
const HEIGHT = 380;
const RADIUS = 9;

export function SkillTree() {
  const { user } = useSession();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["skill-tree", user?.id ?? "anonymous"],
    queryFn: () => getSkillTree(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });

  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const root: TreeNodeDatum = {
      name: "Skills",
      children: data.map((c) => ({
        name: c.category,
        xp: c.completion_xp,
        progress: c.progress,
        children: c.children.map((s) => ({
          name: s.name,
          xp: s.completion_xp,
          progress: s.progress,
        })),
      })),
    };

    const hierarchy = d3.hierarchy<TreeNodeDatum>(root);
    const tree = d3
      .tree<TreeNodeDatum>()
      .size([HEIGHT - 40, WIDTH - 140])
      .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.6));
    const layout = tree(hierarchy);

    const g = svg
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .append("g")
      .attr("transform", "translate(70,20)");

    // Links
    g.append("g")
      .selectAll("path")
      .data(layout.links())
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.18)
      .attr("stroke-width", 1.2)
      .attr(
        "d",
        d3
          .linkHorizontal<
            d3.HierarchyPointLink<TreeNodeDatum>,
            d3.HierarchyPointNode<TreeNodeDatum>
          >()
          .x((d) => d.y)
          .y((d) => d.x),
      );

    // Nodes
    const nodes = g
      .append("g")
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNodeDatum>>("g")
      .data(layout.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodes
      .append("circle")
      .attr("r", RADIUS)
      .attr("fill", (d) => {
        // Colors resolved from Tailwind utilities' palette (always defined).
        if (!d.parent) return "#fff7f7"; // foreground-ish
        const p = d.data.progress ?? 0;
        return p >= 0.85 ? "#dc2626" : p >= 0.5 ? "#f59e0b" : "#be123c";
      })
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#2b0b0b")
      .attr("stroke-width", 1.5);

    nodes
      .append("text")
      .attr("dy", (d) => (d.depth === 0 ? -RADIUS - 8 : d.children ? -RADIUS - 8 : RADIUS + 14))
      .attr("text-anchor", "middle")
      .style("font-size", (d) => (d.depth === 0 ? "11px" : d.depth === 1 ? "10px" : "9px"))
      .style("font-weight", (d) => (d.depth <= 1 ? 600 : 400))
      .style("fill", "#fbe4e4")
      .text((d) => {
        if (d.depth === 0) return d.data.name;
        const pct = d.data.progress !== undefined ? Math.round(d.data.progress * 100) : 0;
        return `${d.data.name} · ${pct}%`;
      });
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-small font-semibold">
        <GitFork className="size-4 text-muted-foreground" /> Skill tree
      </p>
      <p className="mt-0.5 text-caption text-muted-foreground">
        Category-level completion XP projection · green ≥85%, amber ≥50%, red below.
      </p>
      {isLoading ? (
        <div className="mt-3">
          <SkeletonLines count={4} />
        </div>
      ) : isError ? (
        <ErrorState
          title="Skill tree unavailable"
          message="The projection is unreachable right now."
          onRetry={() => refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={GitFork}
          title="No skill data yet"
          description="Complete courses to grow your tree."
        />
      ) : (
        <div className="mt-2 overflow-x-auto">
          <svg
            ref={svgRef}
            width={WIDTH}
            height={HEIGHT}
            className="mx-auto text-foreground"
            role="img"
            aria-label="Skill tree"
          />
        </div>
      )}
    </div>
  );
}
