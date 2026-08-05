"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  Pencil,
  Plus,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";

import type { Course } from "@/lib/contracts/content";
import {
  deleteCourse,
  listCoursesAdmin,
  publishCourse,
  submitCourseForReview,
} from "@/lib/api/admin";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CourseStatusBadge } from "@/components/admin/status-badges";
import { formatDate } from "@/lib/format-admin";

const ADMIN_COURSES_KEY = ["admin-courses"] as const;

export function AdminCoursesClient() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const actor = user ?? null;

  const [deleting, setDeleting] = React.useState<Course | null>(null);
  const [submitting, setSubmitting] = React.useState<Course | null>(null);

  const coursesQuery = useQuery({
    queryKey: ADMIN_COURSES_KEY,
    queryFn: () => listCoursesAdmin(),
    enabled: Boolean(user),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });

  const submitMutation = useMutation({
    mutationFn: (courseId: string) => submitCourseForReview(courseId, actor!),
    onSuccess: (course) => {
      toast.success(`"${course.title}" submitted for review.`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: (courseId: string) => publishCourse(courseId, actor!),
    onSuccess: (course) => {
      toast.success(`"${course.title}" published.`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId, actor!),
    onSuccess: () => {
      toast.success("Course deleted.");
      setDeleting(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const columns: DataTableColumn<Course>[] = [
    {
      key: "title",
      header: "Course",
      sortable: true,
      sortValue: (c) => c.title,
      cell: (c) => (
        <div className="min-w-0">
          <Link
            href={`/admin/courses/${c.id}/edit`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {c.title}
          </Link>
          <p className="max-w-md truncate text-xs text-muted-foreground">
            {c.subtitle}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (c) => c.category,
    },
    {
      key: "level",
      header: "Level",
      sortable: true,
      sortValue: (c) => c.level,
      className: "capitalize",
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      sortValue: (c) => c.price_cents,
      cell: (c) =>
        c.price_cents === 0 ? (
          <span className="font-medium text-emerald-600">Free</span>
        ) : (
          <span className="font-medium">
            ${(c.price_cents / 100).toFixed(0)}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (c) => c.status,
      cell: (c) => <CourseStatusBadge status={c.status} />,
    },
    {
      key: "updated_at",
      header: "Updated",
      sortable: true,
      sortValue: (c) => c.updated_at,
      cell: (c) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(c.updated_at)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Courses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Author, review and publish — drafts and in-review courses included.
          </p>
        </div>
        <Button variant="gradient" asChild className="mt-3 w-fit sm:mt-0">
          <Link href="/admin/courses/new">
            <Plus className="size-4" />
            New course
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={coursesQuery.data ?? []}
          rowKey={(c) => c.id}
          loading={coursesQuery.isLoading}
          error={coursesQuery.isError}
          errorMessage={
            coursesQuery.error instanceof Error
              ? coursesQuery.error.message
              : undefined
          }
          onRetry={() => coursesQuery.refetch()}
          searchPlaceholder="Search courses…"
          searchText={(c) => `${c.title} ${c.subtitle} ${c.category}`}
          filters={[
            {
              id: "status",
              label: "status",
              options: [
                { value: "draft", label: "Draft" },
                { value: "in_review", label: "In review" },
                { value: "published", label: "Published" },
              ],
              match: (c, value) => c.status === value,
            },
          ]}
          emptyTitle="No courses yet"
          emptyDescription="Create your first course to start authoring."
          actions={(course) => (
            <>
              <Button variant="ghost" size="icon" asChild title="Preview">
                <Link href={`/courses/${course.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild title="Edit">
                <Link href={`/admin/courses/${course.id}/edit`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              {course.status === "draft" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Submit for review"
                  disabled={submitMutation.isPending || !actor}
                  onClick={() => setSubmitting(course)}
                >
                  <Send className="size-4" />
                </Button>
              ) : null}
              {course.status === "in_review" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Publish (second reviewer)"
                  disabled={publishMutation.isPending || !actor}
                  onClick={() => publishMutation.mutate(course.id)}
                >
                  <UploadCloud className="size-4 text-emerald-600" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                title="Delete"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleting(course)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        />
      </div>

      {/* Submit-for-review confirm */}
      <ConfirmDialog
        open={submitting !== null}
        onOpenChange={(open) => !open && setSubmitting(null)}
        title="Submit for review?"
        description="The course moves to 'in review'. A second reviewer can then publish it — the author cannot self-publish."
        confirmLabel="Submit"
        destructive={false}
        pending={submitMutation.isPending}
        onConfirm={() => {
          if (submitting) submitMutation.mutate(submitting.id);
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this course?"
        description={
          deleting
            ? `"${deleting.title}" will be removed from the store. This is logged to the audit trail.`
            : undefined
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </PageContainer>
  );
}
