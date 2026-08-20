"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar } from "lucide-react";

import { getSkillTree } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { RadarChart } from "@/components/viz/radar-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonLines } from "@/components/shared/skeletons";

/** Skill radar (UI §5.5): category balance on the radar alongside the tree. */
export function SkillRadar() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["skill-tree", user?.id ?? "anonymous"],
    queryFn: () => getSkillTree(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });

  const axes = (data ?? []).map((c) => ({
    label: c.category,
    value: Math.round((c.progress ?? 0) * 100),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-small font-semibold">
        <Radar className="size-4 text-muted-foreground" /> Skill balance
      </p>
      <p className="mt-0.5 text-caption text-muted-foreground">
        Category completion across the curriculum.
      </p>
      {isLoading ? (
        <div className="mt-3">
          <SkeletonLines count={3} />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon={Radar}
            title="No skill data yet"
            description="Complete courses to fill your radar."
          />
        </div>
      ) : (
        <div className="mt-2">
          <RadarChart axes={axes} height={200} />
        </div>
      )}
    </div>
  );
}