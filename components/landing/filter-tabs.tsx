import { cn } from "@/lib/utils";

export interface FilterTab {
  value: string;
  label: string;
}

export interface FilterTabsProps {
  tabs: FilterTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/** Keyboard-native pill tabs used for client-side landing filters. */
export function FilterTabs({ tabs, value, onChange, label }: FilterTabsProps) {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={label} role="tablist">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
