"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle, Lock, TriangleAlert } from "lucide-react";

import type { TicketCategory, TicketPriority } from "@/lib/contracts/support";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from "@/lib/contracts/support";
import { createTicket } from "@/lib/api/support";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: "Billing & payments",
  courses: "Courses & video",
  judge: "Code judge",
  labs: "Labs & terminals",
  assessments: "Assessments",
  account: "Account & profile",
  other: "Something else",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low — cosmetic or nice-to-have",
  medium: "Medium — blocks part of my work",
  high: "High — broken feature, workaround exists",
  urgent: "Urgent — billing error or everything blocked",
};

// Values come from the contract arrays (single source of truth); labels are
// this surface's copy.
const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] =
  TICKET_CATEGORIES.map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
  }));

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] =
  TICKET_PRIORITIES.map((value) => ({
    value,
    label: PRIORITY_LABELS[value],
  }));

const createTicketSchema = z.object({
  subject: z
    .string()
    .min(3, "Give the ticket a short subject (min 3 characters).")
    .max(120, "Subject is too long (max 120 characters)."),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  body: z
    .string()
    .min(10, "Describe the issue in at least 10 characters.")
    .max(4000, "Keep the description under 4000 characters."),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export function CreateTicketForm() {
  const router = useRouter();
  const { user } = useSession();
  const [pending, setPending] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      category: "other",
      priority: "medium",
      body: "",
    },
  });

  const onSubmit = async (values: CreateTicketValues) => {
    if (!user) return;
    setPending(true);
    setSubmitError(null);
    try {
      const ticket = await createTicket(values, user);
      router.push(`/support/${ticket.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not open the ticket.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <PageContainer>
      <Link
        href="/support"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Back to my tickets
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-h1">
          Open a ticket
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what broke or what looks off — an agent picks it up from the
          support queue.
        </p>
      </div>

      {submitError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t open the ticket</p>
            <p className="mt-0.5 text-destructive/90">{submitError}</p>
          </div>
        </div>
      ) : null}

      <Card className="mt-5 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Ticket details</CardTitle>
          <CardDescription>
            Everything you write here is visible to you and to support agents.
          </CardDescription>
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Double charge on Cloud Security Essentials"
                        className="h-10"
                        aria-describedby="support-subject-hint"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription id="support-subject-hint">
                      One short sentence — the agent&apos;s first read of your
                      issue.
                    </FormDescription>
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
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select a priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What happened?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Include what you were doing, what you expected, and what happened instead. For billing issues, mention the course or order id if you have it."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    {DEMO_MODE ? (
                      <FormDescription>
                        Mock note: a subject containing{" "}
                        <code className="rounded bg-secondary px-1 font-mono">
                          boom
                        </code>{" "}
                        demos the create-failure state.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Lock className="size-3" />
                  Internal notes are only visible to agents — never to you.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/support")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={pending}
                  >
                    {pending && <LoaderCircle className="animate-spin" />}
                    {pending ? "Opening ticket…" : "Open ticket"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
