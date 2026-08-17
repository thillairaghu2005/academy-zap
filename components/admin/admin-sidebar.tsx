"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  BadgeCheck,
  CodeXml,
  Compass,
  FlaskConical,
  LayoutDashboard,
  LifeBuoy,
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
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reviews", label: "Credential reviews", icon: BadgeCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
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
          ? "bg-primary/10 font-semibold text-primary shadow-[inset_3px_0_0_var(--color-primary)]"
          : "text-muted-foreground hover:bg-primary-light hover:text-primary",
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
 * A "Replay walkthrough" entry sits at the bottom of the desktop rail.
 */
export function AdminSidebar({ onReplay }: { onReplay?: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto border-b border-border bg-white px-4 py-2 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-52 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
    >
      <p className="hidden px-3 pb-1.5 pt-1 text-caption font-semibold uppercase tracking-widest text-muted-foreground/60 lg:block">
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

      {onReplay ? (
        <button
          onClick={onReplay}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:mt-auto"
        >
          <Compass className="size-4 shrink-0" />
          Replay walkthrough
        </button>
      ) : null}
    </nav>
  );
}
