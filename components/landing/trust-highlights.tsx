"use client";

import { useQuery } from "@tanstack/react-query";

import { getCourseTrust } from "@/lib/data/demo/trust";
import { TrustBadge } from "@/components/shared/trust-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TrustHighlights() {
  const query = useQuery({ queryKey: ["homepage-trust"], queryFn: () => getCourseTrust("homepage") });
  if (query.isLoading || !query.data) {
    return <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Trust signals</p>
        <div className="mt-3 flex flex-wrap gap-2">{query.data.signals.map((signal) => <TrustBadge key={signal.id} kind={signal.kind} label={signal.label} detail={signal.detail} />)}</div>
      </Card>
      {query.data.metrics.slice(0, 2).map((metric) => <Card key={metric.label} className="p-5"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 font-display text-h2">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">Current platform projection</p></Card>)}
      <Card className="p-5 sm:col-span-3 lg:col-span-1"><p className="text-xs text-muted-foreground">Hiring partners learning here</p><div className="mt-3 flex flex-wrap gap-2">{query.data.partner_labels.map((partner) => <span key={partner} className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium">{partner}</span>)}</div></Card>
    </div>
  );
}
