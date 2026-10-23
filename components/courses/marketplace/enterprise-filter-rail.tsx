"use client";

import * as React from "react";
import {
  Award,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  categoryCounts?: Record<string, number>;
  className?: string;
}

export const ENTERPRISE_DOMAINS = [
  { value: "all", label: "All Domains" },
  { value: "Cybersecurity", label: "Cyber Defense & Security" },
  { value: "Cloud & DevOps", label: "Cloud & Infrastructure" },
  { value: "AI & ML", label: "AI & Machine Learning" },
  { value: "Systems", label: "Systems Architecture" },
  { value: "Web Development", label: "Web Development" },
  { value: "Programming", label: "Programming & Languages" },
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Networking", label: "Networking & Protocols" },
];

export const ENTERPRISE_FORMATS = [
  { value: "all", label: "All Formats" },
  { value: "digital", label: "Digital Training (Self-paced)" },
  { value: "lab", label: "Hands-on Lab" },
  { value: "project", label: "Guided Project" },
  { value: "assessment", label: "Skill Assessment / Quiz" },
];

export const ENTERPRISE_LEVELS = [
  { value: "all", label: "All Skill Levels" },
  { value: "beginner", label: "Foundational" },
  { value: "intermediate", label: "Associate" },
  { value: "advanced", label: "Professional" },
];

export const ENTERPRISE_DURATIONS = [
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
  categoryCounts = {},
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
      aria-label="Course catalog filters"
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-foreground" aria-hidden="true" />
          <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
            Filter Courses
          </h2>
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 size-3" />
            Reset all
          </Button>
        )}
      </div>

      {/* Credential Badge Toggle */}
      <div className="rounded-lg border border-border/80 bg-surface-1 p-3 transition-colors">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2.5">
            <Award className="size-4 text-primary shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground">Verifiable Badge</p>
              <p className="text-[11px] text-muted-foreground">Accredited skill credential</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.hasBadge}
            onChange={(e) => onFilterChange("hasBadge", e.target.checked)}
            className="size-4 rounded border-border accent-primary cursor-pointer focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>

      {/* Domain / Curriculum Category */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Domain
        </h3>
        <div className="space-y-0.5">
          {ENTERPRISE_DOMAINS.map((dom) => {
            const isSelected = filters.domain === dom.value;
            const count = dom.value === "all" ? totalResults : categoryCounts[dom.value];

            return (
              <button
                key={dom.value}
                type="button"
                onClick={() => onFilterChange("domain", dom.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <span className="truncate mr-2">{dom.label}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {typeof count === "number" && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {count}
                    </span>
                  )}
                  {isSelected && <Check className="size-3.5 text-foreground" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skill Level */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Skill Level
        </h3>
        <div className="space-y-0.5">
          {ENTERPRISE_LEVELS.map((lvl) => {
            const isSelected = filters.level === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => onFilterChange("level", lvl.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <span>{lvl.label}</span>
                {isSelected && <Check className="size-3.5 text-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Learning Format */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Learning Format
        </h3>
        <div className="space-y-0.5">
          {ENTERPRISE_FORMATS.map((fmt) => {
            const isSelected = filters.format === fmt.value;
            return (
              <button
                key={fmt.value}
                type="button"
                onClick={() => onFilterChange("format", fmt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <span>{fmt.label}</span>
                {isSelected && <Check className="size-3.5 text-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Duration
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {ENTERPRISE_DURATIONS.map((dur) => {
            const isSelected = filters.duration === dur.value;
            return (
              <button
                key={dur.value}
                type="button"
                onClick={() => onFilterChange("duration", dur.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-center text-xs transition-colors border",
                  isSelected
                    ? "border-foreground bg-secondary font-semibold text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {dur.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing / Access */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Access
        </h3>
        <div className="grid grid-cols-3 gap-1">
          {[
            { value: "all", label: "All" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ].map((opt) => {
            const isSelected = filters.price === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFilterChange("price", opt.value)}
                className={cn(
                  "rounded-md py-1.5 text-center text-xs transition-colors border",
                  isSelected
                    ? "border-foreground bg-secondary font-semibold text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
