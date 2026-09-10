"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Database, ChevronRight } from "lucide-react";
import { listPeerSolutions } from "@/lib/data/judge-facade";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

export function PeerSolutionsTab({ problemId }: { problemId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["judge-peer-solutions", problemId],
    queryFn: () => listPeerSolutions(problemId),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <SkeletonLines count={2} />
        <SkeletonLines count={2} />
        <SkeletonLines count={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Solutions Unavailable" 
          message="We couldn't load peer solutions for this problem." 
          code="ERR_SOLUTIONS" 
          onRetry={() => refetch()} 
        />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <EmptyState 
          icon={Users} 
          title="No solutions yet" 
          description="Be the first to submit an accepted solution to this problem!" 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6 pb-20">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="font-display text-sm font-semibold text-muted-foreground">Top Solutions</h3>
        <span className="text-xs text-muted-foreground">Sorted by runtime</span>
      </div>
      
      <div className="flex flex-col gap-2">
        {data.map((solution) => (
          <button 
            key={solution.submission_id} 
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 rounded-md border border-border">
                <AvatarImage src={solution.user_avatar} alt={solution.user_name} />
                <AvatarFallback className="rounded-md">{solution.user_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{solution.user_name}</span>
                <span className="text-xs text-muted-foreground capitalize">{solution.language}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{solution.runtime_ms}ms</span>
              </div>
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <Database className="h-3.5 w-3.5" />
                <span className="font-mono">{(solution.memory_kb / 1024).toFixed(1)} MB</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
