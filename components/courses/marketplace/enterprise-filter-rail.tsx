"use client";

import * as React from "react";
import {
  Award,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface EnterpriseFilterState {
  domain: string;
  format: string;
  level: string;
  hasBadge: boolean;
  duration: string;
  price: string;
}

interface EnterpriseFilterRailProps {
  filters: EnterpriseFilterState;
  onFilterChange: (key: keyof EnterpriseFilterState, value: string | boolean) => void;
  onClearFilters: () => void;
  totalResults: number;
  className?: string;
}

const DOMAINS = [
  { value: "all", label: "All Domains" },
  { value: "Cloud & Distributed Systems", label: "Cloud & Infrastructure" },
  { value: "AI & Machine Learning", label: "Generative AI & ML" },
  { value: "Security & Cryptography", label: "Cyber Defense & Security" },
  { value: "Systems & Architecture", label: "DevOps & SRE" },
  { value: "Web & Full-Stack", label: "Full-Stack Engineering" },
];

const FORMATS = [
  { value: "all", label: "All Formats" },
  { value: "digital", label: "Digital Training (Self-paced)" },
  { value: "lab", label: "Hands-on Lab" },
  { value: "path", label: "Role Learning Plan" },
  { value: "exam", label: "Certification Exam Prep" },
];

const LEVELS = [
  { value: "all", label: "All Skill Levels" },
  { value: "beginner", label: "Foundational" },
  { value: "intermediate", label: "Associate" },
  { value: "advanced", label: "Professional" },
  { value: "expert", label: "Specialty / Expert" },
];

const DURATIONS = [
  { value: "all", label: "Any Duration" },
  { value: "under-2", label: "< 2 Hours" },
  { value: "2-to-5", label: "2 – 5 Hours" },
  { value: "5-to-10", label: "5 – 10 Hours" },
  { value: "over-10", label: "10+ Hours" },
];

export function EnterpriseFilterRail({
  filters,
  onFilterChange,
  onClearFilters,
  totalResults,
  className,
}: EnterpriseFilterRailProps) {
  const isFiltered =
    filters.domain !== "all" ||
    filters.format !== "all" ||
    filters.level !== "all" ||
    filters.hasBadge ||
    filters.duration !== "all" ||
    filters.price !== "all";

  return (
    <aside
      aria-label="Enterprise catalog filters"
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
            Filter Curriculum
          </h2>
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            {totalResults} Courses
          </Badge>
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 size-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Credential Badge Toggle (Zapsters Enterprise standard) */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 transition-all">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Award className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Verifiable Badges</p>
              <p className="text-[10px] text-muted-foreground">Credly & OpenBadges accredited</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.hasBadge}
            onChange={(e) => onFilterChange("hasBadge", e.target.checked)}
            className="size-4 rounded border-border accent-primary focus:ring-primary cursor-pointer"
          />
        </label>
      </div>

      {/* Domain / Curriculum Category */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Enterprise Domain
        </span>
        <div className="space-y-1">
          {DOMAINS.map((dom) => {
            const isSelected = filters.domain === dom.value;
            return (
              <button
                key={dom.value}
                type="button"
                onClick={() => onFilterChange("domain", dom.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                )}
              >
                <span>{dom.label}</span>
                {isSelected && <Check className="size-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skill Level */}
      <div className="space-y-2.5 border-t border-border/40 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Skill Level
        </span>
        <div className="space-y-1">
          {LEVELS.map((lvl) => {
            const isSelected = filters.level === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => onFilterChange("level", lvl.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                )}
              >
                <span>{lvl.label}</span>
                {isSelected && <Check className="size-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Format */}
      <div className="space-y-2.5 border-t border-border/40 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Delivery Format
        </span>
        <div className="space-y-1">
          {FORMATS.map((fmt) => {
            const isSelected = filters.format === fmt.value;
            return (
              <button
                key={fmt.value}
                type="button"
                onClick={() => onFilterChange("format", fmt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                )}
              >
                <span>{fmt.label}</span>
                {isSelected && <Check className="size-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2.5 border-t border-border/40 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Estimated Duration
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {DURATIONS.map((dur) => {
            const isSelected = filters.duration === dur.value;
            return (
              <button
                key={dur.value}
                type="button"
                onClick={() => onFilterChange("duration", dur.value)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-center text-xs transition-colors border",
                  isSelected
                    ? "border-primary/50 bg-primary/15 font-semibold text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {dur.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
