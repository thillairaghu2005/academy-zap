"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BadgeX,
  Clock3,
  ShieldQuestion,
} from "lucide-react";

import { getBadges } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonGrid } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Badge wall — every badge carries a stable verify URL (§7.3). The   */
/*  status shown is current truth at that URL, not a cached claim.     */
/* ------------------------------------------------------------------ */

const STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode }> = {
  verified: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    icon: <BadgeCheck className="size-3.5" />,
  },
  flagged: {
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    icon: <ShieldQuestion className="size-3.5" />,
  },
  revoked: {
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-700",
    icon: <BadgeX className="size-3.5" />,
  },
};

export function BadgeWall() {
  const { user } = useSession();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["badges", user?.id ?? "anonymous"],
    queryFn: () => getBadges(user?.id ?? ""),
    enabled: !!user,
    retry: false,
  });

  const badges = data ?? [];

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-display text-h1">
          Badge wall
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every badge is a W3C-Verifiable-Credential-shaped claim, signed
           by the demo service and re-verifiable at its public URL — a stale or edited
          screenshot cannot keep working.
        </p>
      </div>

      {!user ? (
        <EmptyState
          icon={Award}
          title="Sign in to see your badges"
          description="Your earned credentials will appear here once you're signed in."
        />
      ) : isLoading ? (
        <SkeletonGrid count={4} />
      ) : isError ? (
        <ErrorState
          title="Could not load badges"
          message="The badge service is unreachable right now."
          code="badge_service_down"
          onRetry={() => refetch()}
        />
      ) : badges.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No badges yet"
          description="Finish courses, ace assessments and complete labs to earn your first credential."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {badges.map((b, i) => {
            const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.verified!;
            return (
              <motion.div
                key={b.badge_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-5 transition-colors",
                  b.status === "revoked"
                    ? "border-rose-500/25 opacity-75"
                    : b.status === "flagged"
                      ? "border-amber-500/25"
                      : "border-border hover:border-emerald-500/30",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-xl",
                      b.status === "revoked"
                        ? "bg-rose-500/10 text-rose-700"
                        : b.status === "flagged"
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-emerald-500/10 text-emerald-700",
                    )}
                  >
                    {b.status === "revoked" ? (
                      <BadgeX className="size-5" />
                    ) : b.status === "flagged" ? (
                      <Clock3 className="size-5" />
                    ) : (
                      <Award className="size-5" />
                    )}
                  </span>
                  <Badge className={cn("text-caption", style.badge)}>
                    {style.icon}
                    {b.status}
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-h3">
                  {b.name}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {b.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-caption text-muted-foreground">
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium">
                    {b.category}
                  </span>
                  <span className="font-mono">
                    {new Date(b.earned_at).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant={b.status === "verified" ? "outline" : "ghost"}
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push(b.verify_url)}
                >
                  <BadgeCheck className="size-3.5" /> Verify
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
