"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import type { CourseLevel } from "@/lib/contracts/content";
import { createCourse, updateCourse } from "@/lib/api/admin";
import { getCourse } from "@/lib/api/content";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { CourseStatusBadge } from "@/components/admin/status-badges";
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
      form.reset({
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        category: course.category,
        level: course.level,
        language: course.language,
        price_cents: course.price_cents,
        estimated_hours: course.estimated_hours,
      });
    }
  }, [isEdit, courseQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: CourseValues) =>
      isEdit
        ? updateCourse(courseId!, values, actor!)
        : createCourse(values, actor!),
    onSuccess: (course) => {
      toast.success(`${isEdit ? "Updated" : "Created"} "${course.title}".`);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      router.push("/admin/courses");
    },
    onError: (error: Error) => toast.error(error.message),
  });

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

  const course = courseQuery.data ?? null;

  return (
    <PageContainer narrow>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <a href="/admin/courses">
          <ArrowLeft className="size-4" />
          Back to courses
        </a>
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isEdit ? "Edit course" : "New course"}
        </h1>
        {course ? <CourseStatusBadge status={course.status} /> : null}
      </div>

      {isEdit && course ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          Review workflow: drafts go in review, a second reviewer publishes —
          status changes here are not form-editable.
        </p>
      ) : null}

      <Card className="mt-6">
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

              <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
                <Badge variant="outline" className="mr-auto text-[11px]">
                  {isEdit ? "Editing as draft state" : "Created as draft"}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/courses")}
                >
                  Cancel
                </Button>
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
