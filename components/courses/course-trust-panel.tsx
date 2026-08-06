"use client";

import { useQuery } from "@tanstack/react-query";
import { getCourseTrust } from "@/lib/api/trust";
import { TrustBadge } from "@/components/shared/trust-badge";
import { Card } from "@/components/ui/card";
import { SkeletonLines } from "@/components/shared/skeletons";

export function CourseTrustPanel({ courseId }: { courseId: string }) {
  const query = useQuery({ queryKey: ["course-trust", courseId], queryFn: () => getCourseTrust(courseId) });
  if (query.isLoading) return <Card className="mt-5 p-4"><SkeletonLines count={2} /></Card>;
  if (!query.data) return null;
  return (
    <Card className="mt-5 p-4">
      <div className="flex flex-wrap gap-2">{query.data.signals.map((signal) => <TrustBadge key={signal.id} kind={signal.kind} label={signal.label} detail={signal.detail} />)}</div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        {query.data.metrics.map((metric) => <div key={metric.label}><p className="text-muted-foreground">{metric.label}</p><p className="mt-1 font-semibold text-foreground">{metric.value}</p></div>)}
      </div>
      <p className="mt-4 text-caption text-muted-foreground">Learners at {query.data.partner_labels.join(", ")} practice with similar workflows.</p>
    </Card>
  );
}
