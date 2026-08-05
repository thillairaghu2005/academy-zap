"use client";

import { useQuery } from "@tanstack/react-query";
import { FileDiff, Info } from "lucide-react";

import type { CoursePublishedSnapshot } from "@/lib/mocks/courses";
import { getCourseReviewDiff } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { formatMoney } from "@/lib/format";

function formatValue(field: keyof CoursePublishedSnapshot, value: string | number): string {
  if (field === "price_cents") return formatMoney(value as number);
  if (field === "estimated_hours") return `${value} h`;
  if (field === "level") return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  return String(value);
}

/**
 * Field-level diff between the current revision and the last published
 * version (Task 2) — served by getCourseReviewDiff, never computed here.
 */
export function CourseReviewDiffCard({ courseId }: { courseId: string }) {
  const diffQuery = useQuery({
    queryKey: ["course-review-diff", courseId],
    queryFn: () => getCourseReviewDiff(courseId),
  });

  if (diffQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <SkeletonLines count={3} />
        </CardContent>
      </Card>
    );
  }

  if (diffQuery.isError || !diffQuery.data) {
    return (
      <Card>
        <CardContent className="p-4">
          <ErrorState
            title="Couldn't load the review diff"
            message={
              diffQuery.error instanceof Error
                ? diffQuery.error.message
                : "The diff backend is not responding."
            }
            onRetry={() => diffQuery.refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const diff = diffQuery.data;

  return (
    <Card className="border-amber-500/25">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-sm">
          <FileDiff className="size-4 text-amber-700" />
          Changes since last published version
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {!diff.has_published_version ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            First-time publication — this course has never been published, so
            there is no published version to compare against.
          </p>
        ) : diff.changed.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            No changes to the authorable fields since the last published
            version (syllabus/lesson edits aren&apos;t tracked yet).
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-3 py-2 font-semibold">Field</th>
                  <th className="px-3 py-2 font-semibold">Published</th>
                  <th className="px-3 py-2 font-semibold">In review</th>
                </tr>
              </thead>
              <tbody>
                {diff.changed.map((item) => (
                  <tr
                    key={item.field}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium">{item.label}</td>
                    <td className="px-3 py-2.5">
                      <span className="line-through decoration-rose-400/60">
                        {formatValue(item.field, item.before)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                      >
                        {formatValue(item.field, item.after)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
