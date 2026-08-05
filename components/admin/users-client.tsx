"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

import type { SessionUser } from "@/lib/contracts/session";
import { listAdminUsers, setUserRole } from "@/lib/api/admin";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { RoleBadge } from "@/components/admin/status-badges";

export function AdminUsersClient() {
  const queryClient = useQueryClient();
  const { user: actor } = useSession();
  const actorId = actor?.id ?? "";

  const [toggleTarget, setToggleTarget] = React.useState<{
    user: SessionUser;
    to: SessionUser["role"];
  } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listAdminUsers(),
    enabled: Boolean(actor),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: SessionUser["role"] }) =>
      setUserRole(userId, role, actor!),
    onSuccess: (updated) => {
      toast.success(
        `${updated.display_name} is now ${updated.role === "admin" ? "an admin" : "a learner"}.`,
      );
      setToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: DataTableColumn<SessionUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      sortValue: (u) => u.display_name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-[10px] font-bold text-white">
            {u.display_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (u) => u.role,
      cell: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "id",
      header: "User id",
      cell: (u) => (
        <code className="font-mono text-[11px] text-muted-foreground">
          {u.id.slice(0, 13)}…
        </code>
      ),
    },
  ];

  return (
    <PageContainer>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Directory + role management. The demo learner stays a learner so the
          public demo never silently unlocks /admin.
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={usersQuery.data ?? []}
          rowKey={(u) => u.id}
          loading={usersQuery.isLoading}
          error={usersQuery.isError}
          errorMessage={
            usersQuery.error instanceof Error
              ? usersQuery.error.message
              : undefined
          }
          onRetry={() => usersQuery.refetch()}
          searchPlaceholder="Search users…"
          searchText={(u) => `${u.display_name} ${u.email} ${u.role}`}
          filters={[
            {
              id: "role",
              label: "role",
              options: [
                { value: "admin", label: "Admin" },
                { value: "learner", label: "Learner" },
              ],
              match: (u, value) => u.role === value,
            },
          ]}
          emptyTitle="No users"
          emptyDescription="The user directory is empty."
          actions={(u) => (
            <Button
              variant="ghost"
              size="sm"
              disabled={!actor || u.id === actorId}
              title={
                u.id === actorId
                  ? "You can't change your own role"
                  : u.role === "admin"
                    ? "Revoke admin"
                    : "Grant admin"
              }
              onClick={() =>
                setToggleTarget({
                  user: u,
                  to: u.role === "admin" ? "learner" : "admin",
                })
              }
            >
              {u.role === "admin" ? (
              <ShieldOff className="size-4 text-muted-foreground" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
              {u.role === "admin" ? "Revoke" : "Make admin"}
            </Button>
          )}
        />
      </div>

      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={
          toggleTarget?.to === "admin" ? "Grant admin role?" : "Revoke admin role?"
        }
        description={
          toggleTarget
            ? `${toggleTarget.user.display_name} will become ${
                toggleTarget.to === "admin" ? "an admin" : "a learner"
              }. The change is logged to the audit trail.`
            : undefined
        }
        confirmLabel={toggleTarget?.to === "admin" ? "Grant admin" : "Revoke"}
        pending={roleMutation.isPending}
        onConfirm={() => {
          if (toggleTarget) {
            roleMutation.mutate({
              userId: toggleTarget.user.id,
              role: toggleTarget.to,
            });
          }
        }}
      />
    </PageContainer>
  );
}
