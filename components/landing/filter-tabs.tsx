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

export function FilterTabs({ tabs, value, onChange, label }: FilterTabsProps) {
  return (
    <div
      className="flex max-w-full gap-6 overflow-x-auto border-b border-border pb-px"
      aria-label={label}
      role="group"
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "whitespace-nowrap pb-2 text-sm font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
