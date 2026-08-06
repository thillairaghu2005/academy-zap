import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem { label: string; href?: string; }

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 overflow-x-auto text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex shrink-0 items-center gap-1.5">
          {index > 0 ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}
          {item.href && index < items.length - 1 ? <Link href={item.href} className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
