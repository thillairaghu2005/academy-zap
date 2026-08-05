"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  LoaderCircle,
  Save,
  Send,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import type { CourseLevel } from "@/lib/contracts/content";
import {
  createCourse,
  publishCourse,
  saveDraft,
  submitCourseForReview,
  unpublishCourse,
  updateCourse,
} from "@/lib/api/admin";
import { getCourse } from "@/lib/api/content";
import { MOCK_REVIEWERS } from "@/lib/mocks/users";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { CourseStatusBadge } from "@/components/admin/status-badges";
import { CourseReviewDiffCard } from "@/components/admin/course-review-diff";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MOCK_ADMIN_USERS } from "@/lib/mocks/admin";
import { formatMoney } from "@/lib/format";

const CATEGORIES = [
  "Cybersecurity",
  "Web Development",
  "Cloud & DevOps",
  "Programming",
];

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  subtitle: z.string().min(5, "Subtitle must be at least 5 characters."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters."),
  category: z.string().min(1, "Pick a category."),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  language: z.string().min(2, "Language is required."),
  price_cents: z.number().int().min(0, "Price can't be negative."),
  estimated_hours: z
    .number()
    .positive("Estimated hours must be greater than 0."),
});

type CourseValues = z.infer<typeof courseSchema>;

/** Short "Saving draft…" / "Draft saved" feedback for the autosave. */
type AutosaveState = "idle" | "saving" | "saved" | "error";

export function CourseForm({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const actor = user ?? null;

  const isEdit = Boolean(courseId);
  const courseQuery = useQuery({
    queryKey: ["course", courseId ?? ""],
    queryFn: () => getCourse(courseId!),
    enabled: isEdit,
  });

  const form = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      category: "Cybersecurity",
      level: "beginner",
      language: "English",
      price_cents: 0,
      estimated_hours: 5,
    },
  });

  // Hydrate the form once the course loads in edit mode.
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    const course = courseQuery.data;
    if (isEdit && course && !hydrated.current) {
      hydrated.current = true;
      const values = {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        category: course.category,
        level: course.level,
        language: course.language,
        price_cents: course.price_cents,
        estimated_hours: course.estimated_hours,
      };
      form.reset(values);
      // Autosave must not fire for the values we just loaded.
      lastSaved.current = JSON.stringify(values);
    }
  }, [isEdit, courseQuery.data, form]);

  const course = courseQuery.data ?? null;
  const status = course?.status ?? "draft";
  // in_review / published are locked: status transitions are workflow-owned.
  const locked = status === "in_review" || status === "published";

  /* ---------------------------------------------------------------- */
  /*  Draft autosave (Task 2) — debounced saveDraft, silent (no audit) */
  /* ---------------------------------------------------------------- */
  const [autosaveState, setAutosaveState] = React.useState<AutosaveState>("idle");
  // The last payload actually persisted — autosave skips when unchanged.
  const lastSaved = React.useRef<string>("");
  const autosaveMutation = useMutation({
    mutationFn: (payload: { courseId: string; values: Partial<CourseValues> }) =>
      saveDraft(payload.courseId, payload.values, actor!),
    onSuccess: () => {
      setAutosaveState("saved");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: () => setAutosaveState("error"),
  });

  const watchedValues = useWatch<CourseValues>({ control: form.control });
  React.useEffect(() => {
    if (!isEdit || !actor || !hydrated.current || status !== "draft") return;
    const snapshot = JSON.stringify(watchedValues);
    if (snapshot === lastSaved.current) return;
    const timer = setTimeout(() => {
      lastSaved.current = snapshot;
      setAutosaveState("saving");
      autosaveMutation.mutate({ courseId: courseId!, values: watchedValues });
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, actor, hydrated, status, courseId, watchedValues]);

  /* ---------------------------------------------------------------- */
  /*  Workflow mutations                                               */
  /* ---------------------------------------------------------------- */
  const invalidateCourse = () => {
    queryClient.invalidateQueries({ queryKey: ["course", courseId ?? ""] });
    queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: CourseValues) =>
      isEdit
        ? updateCourse(courseId!, values, actor!)
        : createCourse(values, actor!),
    onSuccess: (saved) => {
      toast.success(`${isEdit ? "Updated" : "Created"} "${saved.title}".`);
      if (isEdit) {
        invalidateCourse();
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
        router.push("/admin/courses");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitReviewMutation = useMutation({
    mutationFn: () => submitCourseForReview(courseId!, actor!),
    onSuccess: (submitted) => {
      toast.success(`"${submitted.title}" submitted for review.`);
      invalidateCourse();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Reviewer picker — who performs the second-reviewer publish. Defaults to
  // the current admin (derived — no effect); once the admin picks, that
  // choice sticks.
  const [reviewerId, setReviewerId] = React.useState<string | null>(null);
  const selectedReviewerId = reviewerId ?? (course && actor ? actor.id : null);
  const reviewer =
    MOCK_REVIEWERS.find((r) => r.id === selectedReviewerId) ?? null;
  const sameAsSubmitter =
    course?.submitted_by != null && reviewer?.id === course.submitted_by;

  const publishMutation = useMutation({
    mutationFn: () => publishCourse(courseId!, reviewer!),
    onSuccess: (published) => {
      toast.success(`"${published.title}" published to the catalog.`);
      invalidateCourse();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishCourse(courseId!, actor!),
    onSuccess: (unpublished) => {
      toast.success(`"${unpublished.title}" moved back to draft.`);
      invalidateCourse();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [confirmSubmit, setConfirmSubmit] = React.useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = React.useState(false);

  const onSubmit = (values: CourseValues) => {
    if (!actor) return;
    saveMutation.mutate(values);
  };

  /* ---------- Edit-mode loading / 404 ---------- */
  if (isEdit && courseQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SkeletonLines count={6} />
          <SkeletonLines count={4} />
        </div>
      </PageContainer>
    );
  }
  if (isEdit && (courseQuery.isError || !courseQuery.data)) {
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load this course"
          message={
            courseQuery.error instanceof Error
              ? courseQuery.error.message
              : "The course was not found."
          }
          onRetry={() => courseQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const submittedByName = course?.submitted_by
    ? (MOCK_ADMIN_USERS.find((u) => u.id === course.submitted_by)
        ?.display_name ?? "Unknown author")
    : null;

  return (
    <PageContainer narrow>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <a href="/admin/courses">
          <ArrowLeft className="size-4" />
          Back to courses
        </a>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isEdit ? "Edit course" : "New course"}
        </h1>
        {course ? <CourseStatusBadge status={course.status} /> : null}
        {isEdit && course ? (
          <a
            href={`/courses/${course.id}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Eye className="size-4" />
            Preview
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground">
        {status === "draft"
          ? "Drafts are yours to edit — changes autosave. Submit when ready; a second reviewer then publishes."
          : status === "in_review"
            ? "Locked for review. A second reviewer approves the diff and publishes — the author cannot self-publish."
            : "Published — read-only. Unpublish to open a new authoring cycle."}
      </p>

      {/* Review workflow extras */}
      {isEdit && course ? (
        <div className="mt-6 flex flex-col gap-4">
          {status === "in_review" ? (
            <>
              <CourseReviewDiffCard courseId={course.id} />
              <Card className="border-emerald-500/25">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-sm">
                    <CheckCircle2 className="size-4 text-emerald-700" />
                    Second-reviewer approval
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 p-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Submitted by{" "}
                    <span className="font-medium text-foreground">
                      {submittedByName}
                    </span>
                    . The two-person rule requires a different reviewer to
                    publish.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="reviewer-picker">
                        Publishing reviewer
                      </Label>
                      <Select
                        value={selectedReviewerId ?? undefined}
                        onValueChange={setReviewerId}
                      >
                        <SelectTrigger id="reviewer-picker" className="w-full sm:w-64">
                          <SelectValue placeholder="Choose a reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_REVIEWERS.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.display_name}
                              {course.submitted_by === r.id
                                ? " (author)"
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            variant="gradient"
                            disabled={
                              !reviewer ||
                              sameAsSubmitter ||
                              publishMutation.isPending
                            }
                            onClick={() => publishMutation.mutate()}
                          >
                            {publishMutation.isPending ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <UploadCloud className="size-4" />
                            )}
                            Publish course
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {sameAsSubmitter
                          ? "The author can't publish their own submission — choose a different reviewer."
                          : "Publishes this course to the public catalog."}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {publishMutation.isError ? (
                    <p className="text-xs text-destructive">
                      {publishMutation.error instanceof Error
                        ? publishMutation.error.message
                        : "Publish failed."}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}

      <Card className={isEdit && course ? "mt-4" : "mt-6"}>
        <CardHeader>
          <CardTitle className="font-display text-base">
            Course details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              noValidate
            >
              {/* Locked (in_review / published) → fieldset disables every control */}
              <fieldset disabled={locked} className="contents">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Incident Response in Depth" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Input placeholder="One-line promise to the learner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What will the learner be able to do after this course?"
                          className="min-h-28 resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={locked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={locked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <FormControl>
                          <Input placeholder="English" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_cents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={100}
                            placeholder="0 = free"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>
                          Minor units — 1299 → {formatMoney(1299)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                {isEdit ? (
                  <span
                    className="mr-auto text-[11px] text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {locked ? (
                      "Read-only — status is owned by the review workflow."
                    ) : autosaveState === "saving" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <LoaderCircle className="size-3 animate-spin" />
                        Saving draft…
                      </span>
                    ) : autosaveState === "saved" ? (
                      <span className="inline-flex items-center gap-1.5 text-success-strong">
                        <CheckCircle2 className="size-3" />
                        Draft saved
                      </span>
                    ) : autosaveState === "error" ? (
                      <span className="inline-flex items-center gap-1.5 text-destructive">
                        Autosave failed — save manually.
                      </span>
                    ) : (
                      "Draft autosaves as you type."
                    )}
                  </span>
                ) : (
                  <Badge variant="outline" className="mr-auto text-[11px]">
                    Created as draft
                  </Badge>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/courses")}
                >
                  Cancel
                </Button>

                {isEdit && status === "published" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmUnpublish(true)}
                  >
                    <Undo2 className="size-4" />
                    Unpublish
                  </Button>
                ) : null}

                {isEdit && status === "draft" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitReviewMutation.isPending || !actor}
                    onClick={() => setConfirmSubmit(true)}
                  >
                    {submitReviewMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Submit for review
                  </Button>
                ) : null}

                {!locked ? (
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={saveMutation.isPending || !actor}
                  >
                    {saveMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isEdit ? "Save changes" : "Create course"}
                  </Button>
                ) : null}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Submit-for-review confirm */}
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={(open) => !open && setConfirmSubmit(false)}
        title="Submit for review?"
        description="The course locks and moves to 'in review'. A second reviewer must then publish it — the author cannot self-publish."
        confirmLabel="Submit"
        destructive={false}
        pending={submitReviewMutation.isPending}
        onConfirm={() => {
          setConfirmSubmit(false);
          submitReviewMutation.mutate();
        }}
      />

      {/* Unpublish confirm */}
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={(open) => !open && setConfirmUnpublish(false)}
        title="Unpublish this course?"
        description="It moves back to draft and leaves the public catalog immediately. The last published version is kept for diffing. Logged to the audit trail."
        confirmLabel="Unpublish"
        pending={unpublishMutation.isPending}
        onConfirm={() => {
          setConfirmUnpublish(false);
          unpublishMutation.mutate();
        }}
      />
    </PageContainer>
  );
}
