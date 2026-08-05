"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldX } from "lucide-react";

import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * F7 admin gate + shell.
 *
 * ROLE CHECK IS FRONTEND-ONLY: the real authorization lives in the backend
 * (role-gated admin APIs, build.md §4.2 — "tightest RBAC"). This client gate
 * mirrors that UX so the route is demoable, and is deliberately NOT
 * presented as security. The mock admin signs in at priya@admin.zapsters.dev.
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <SkeletonLines count={5} />
          <SkeletonLines count={8} />
        </div>
      </PageContainer>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <PageContainer narrow>
        <EmptyState
          icon={ShieldX}
          title="Admins only"
          description="This area is restricted to admin accounts. The demo admin signs in with priya@admin.zapsters.dev. Note: this is a frontend-only role check — real authorization lives in the backend."
          action={
            <Button variant="gradient" asChild>
              <Link href={`/login?next=/admin`}>Sign in as admin</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <div className="lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
