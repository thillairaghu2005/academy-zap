"use client";

import * as React from "react";
import { formatLongEnglishDate } from "@/lib/format";
import { m as motion, useReducedMotion } from "framer-motion";
import { Award, BadgeCheck, Download, Share2 } from "lucide-react";

import type { Course } from "@/lib/contracts/content";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Course completion certificate simulation (Task 4). Rendered as a download-
 * able card when every lesson is complete — a frontend stand-in for the
 * future verifiable credential flow (rank/verify).
 */
export function CertificateDialog({
  open,
  onOpenChange,
  course,
  learnerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  learnerName: string;
}) {
  const announce = useAnnounce();
  const reducedMotion = useReducedMotion() ?? false;
  const certificateRef = React.useRef<HTMLDivElement>(null);
  const completedAt = formatLongEnglishDate(new Date());
  const credentialId = `cred-${course.id.slice(0, 8).toLowerCase()}-${course.id.length}`;

  const shareCertificate = () => {
    announce("Certificate share copied");
    const shareText = `I completed "${course.title}" on Zapsters — ${credentialId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: "Zapsters certificate", text: shareText });
    } else {
      void navigator.clipboard.writeText(shareText);
      toast.success("Share text copied to clipboard");
    }
  };

  const downloadCertificate = () => {
    announce("Certificate downloaded");
    const node = certificateRef.current;
    if (!node || typeof window === "undefined") return;
    // Plain-text certificate file — a client-generated artifact, no server.
    const text = [
      "ZAPSTERS — COURSE CERTIFICATE",
      "==============================",
      "",
      `This certifies that ${learnerName}`,
      "has successfully completed the course",
      "",
      course.title,
      "",
      `Completed on ${completedAt}`,
      `Credential id: ${credentialId}`,
      "",
      "Verify this credential at the public verification page",
      "(frontend demo credential).",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${course.id}-certificate.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            Course complete — certificate
          </DialogTitle>
          <DialogDescription>
            You finished every lesson. Here&apos;s your demo completion
            certificate.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={certificateRef}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-primary-border bg-primary-muted p-6 text-center",
          )}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/10 blur-2xl" />

          <div className="relative z-10">
            <div className="mx-auto grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <BadgeCheck className="size-6" />
            </div>
            {/* Animated seal — the ring + check line-draw on open (UI §4.5). */}
            <svg
              viewBox="0 0 96 96"
              className="pointer-events-none absolute -right-3 -top-3 size-24 text-primary"
              aria-hidden="true"
            >
              <motion.circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="60 14"
                initial={reducedMotion ? undefined : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  reducedMotion ? undefined : { duration: 1.2, ease: "easeOut", delay: 0.2 }
                }
              />
              <motion.path
                d="M30 48 L43 61 L68 34"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? undefined : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  reducedMotion ? undefined : { duration: 0.6, ease: "easeOut", delay: 0.7 }
                }
              />
            </svg>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Zapsters · Certificate of Completion
            </p>
            <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em]">
              {learnerName}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              has successfully completed
            </p>
            <p className="mt-1 font-display text-xl font-semibold">
              {course.title}
            </p>
            <div className="mx-auto mt-5 h-px w-3/4 bg-border" />
            <p className="mt-4 text-xs text-muted-foreground">
              Completed {completedAt}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              {credentialId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" size="sm" onClick={shareCertificate}>
            <Share2 className="size-3.5" />
            Share
          </Button>
          <Button variant="gradient" size="sm" onClick={downloadCertificate}>
            <Download className="size-3.5" />
            Download certificate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
