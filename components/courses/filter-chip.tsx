import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onRemove} className="h-8 gap-1.5 rounded-full text-xs">
      {label}<X className="size-3.5" aria-hidden="true" /><span className="sr-only">Remove filter</span>
    </Button>
  );
}
