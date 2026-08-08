"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CodeXml,
  FlaskConical,
  LifeBuoy,
  LoaderCircle,
  Plus,
  ScrollText,
  ShoppingCart,
  Users,
} from "lucide-react";

import { getAdminDashboard } from "@/lib/data/demo/admin";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/skeletons";
import { formatDate } from "@/lib/format-admin";

const STATS = [
  { key: "courses", label: "Courses", href: "/admin/courses", icon: BookOpen, accent: "from-primary to-primary-hover" },
  { key: "labs", label: "Labs", href: "/admin/labs", icon: FlaskConical, accent: "from-primary to-secondary-accent" },
  { key: "problems", label: "Problems", href: "/admin/problems", icon: CodeXml, accent: "from-primary to-primary-hover" },
  { key: "orders", label: "Orders", href: "/admin/orders", icon: ShoppingCart, accent: "from-primary to-secondary-accent" },
  { key: "users", label: "Users", href: "/admin/users", icon: Users, accent: "from-primary to-primary-hover" },
  { key: "tickets", label: "Tickets", href: "/admin/support", icon: LifeBuoy, accent: "from-primary to-secondary-accent" },
] as const;

export function AdminDashboardClient() {
  const { user } = useSession();
  const actorId = user?.id ?? "";

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", actorId],
    queryFn: () => getAdminDashboard(actorId),
    enabled: Boolean(user),
  });

  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">
          Admin console
        </h1>
        <p className="text-sm text-muted-foreground">
          Authoring, review and audit — the CMS surfaces of the platform.
        </p>
      </div>

      {dashboardQuery.isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      ) : dashboardQuery.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Admin data unavailable"
            message={
              dashboardQuery.error instanceof Error
                ? dashboardQuery.error.message
                : "The admin demo data is unavailable."
            }
            code="ADMIN_ERR"
            onRetry={() => dashboardQuery.refetch()}
          />
        </div>
      ) : dashboardQuery.data ? (
        <>
          {/* Stat cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              const count =
                dashboardQuery.data.counts[stat.key as keyof typeof dashboardQuery.data.counts];
              return (
                <Link key={stat.key} href={stat.href} className="group rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div
                        className={`grid size-9 place-items-center rounded-lg bg-gradient-to-br ${stat.accent} text-white`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-display text-h2">
                          {count}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stat.label}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            {/* Recent audit */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-h2">
                      Recent audit activity
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Append-only — entries are never rewritten
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/audit">
                      <ScrollText className="size-3.5" />
                      Full log
                    </Link>
                  </Button>
                </div>
                <ul className="mt-4 flex flex-col gap-3">
                  {dashboardQuery.data.recent_audit.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs text-foreground">
                          {entry.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.detail}
                        </p>
                      </div>
                        <span className="shrink-0 font-mono text-caption text-muted-foreground/60">
                        {formatDate(entry.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="flex flex-col gap-2.5 p-5">
                  <p className="font-display text-small font-semibold">
                    Quick actions
                  </p>
                  <Button variant="gradient" asChild>
                    <Link href="/admin/courses/new">
                      <Plus className="size-4" />
                      New course
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/admin/courses">
                      Review pending courses
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-2 p-5">
                  <p className="font-display text-small font-semibold">Signed in as</p>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {user?.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user?.display_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <Badge variant="info" className="ml-auto">
                      admin
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {DEMO_MODE ? (
                <p className="flex items-center gap-1.5 text-caption leading-relaxed text-muted-foreground">
                  <LoaderCircle className="size-3 shrink-0" />
                  Mock note: counts come from the fixture stores — the real
                  CMS reads live tables.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
