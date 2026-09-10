"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getEditorial } from "@/lib/data/judge-facade";
import { MarkdownRenderer } from "./statement/MarkdownRenderer";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";

export function EditorialTab({ problemId }: { problemId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["judge-editorial", problemId],
    queryFn: () => getEditorial(problemId),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonLines count={10} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Editorial Unavailable" 
          message="We couldn't load the editorial for this problem." 
          code="ERR_EDITORIAL" 
          onRetry={() => refetch()} 
        />
      </div>
    );
  }

  return (
    <div className="prose prose-sm prose-invert max-w-none p-6 pb-20">
      <MarkdownRenderer content={data.markdown_content} />
    </div>
  );
}
