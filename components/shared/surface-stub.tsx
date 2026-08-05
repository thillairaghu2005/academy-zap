import { Check, CircleSlash, Construction } from "lucide-react";

import type { SurfaceMeta } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";

const statusLabel: Record<SurfaceMeta["status"], string> = {
  shipped: "Live",
  next: "Lands next",
  stubbed: "Scaffolded",
};

/**
 * F-section stub page. Honest about what's planned and what's deliberately
 * not built yet (build.md §3) — stubs never pretend features exist.
 */
export function SurfaceStub({ surface }: { surface: SurfaceMeta }) {
  const Icon = surface.icon;

  return (
    <PageContainer>
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "grid size-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg",
              surface.accent,
            )}
          >
            <Icon className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {surface.title}
              </h1>
              <Badge variant="outline">{surface.stage}</Badge>
              <Badge variant={surface.status === "next" ? "success" : "secondary"}>
                {statusLabel[surface.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {surface.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Main stub state */}
      <div className="mt-8">
        <EmptyState
          icon={Construction}
          title="Shell is live — the surface isn't built yet"
          description={`${surface.description} The mock API module for this subsystem ships together with its F-section, contract types first.`}
          action={
            <Badge variant="info" className="px-3 py-1">
              Build order: {surface.stage} comes after everything before it
            </Badge>
          }
        />
      </div>

      {/* Planned vs deliberately-not-built */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Planned — per build.md {surface.stage}
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {surface.planned.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success-strong" />
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Deliberately not building yet — build.md §3
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {surface.notBuiltYet.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
