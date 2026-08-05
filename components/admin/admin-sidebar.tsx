"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CodeXml,
  FlaskConical,
  LayoutDashboard,
  ScrollText,
  ShoppingCart,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/labs", label: "Labs", icon: FlaskConical },
  { href: "/admin/problems", label: "Problems", icon: CodeXml },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
] as const;

function AdminNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

/**
 * Admin section navigation — vertical rail on desktop, horizontal scrollable
 * tab strip on mobile (the global shell already owns the top + side nav).
 */
export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto border-b border-border bg-card/40 px-4 py-2 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-52 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
    >
      <p className="hidden px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 lg:block">
        Admin / CMS
      </p>
      {ADMIN_NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <AdminNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={active}
          />
        );
      })}
    </nav>
  );
}
