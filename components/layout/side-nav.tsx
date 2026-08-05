"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Menu } from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { sideNavGroups } from "@/lib/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/src/components/Logo/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {sideNavGroups.map((group) => (
        <div key={group.label}>
            <p className="px-3 pb-1.5 pt-5 text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Desktop side rail — hidden below lg, replaced by the mobile sheet */
export function SideNav() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col overflow-y-auto border-r border-border/70 px-3 py-5 lg:flex">
      <div className="px-1 pb-3">
        <Logo size="sm" />
      </div>
      <NavLinks />
    </aside>
  );
}

/** Mobile drawer — trigger lives in the top nav */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { user, isLoading } = useSession();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col overflow-y-auto px-4 pb-8 pt-5">
          <div className="flex items-center justify-between pr-10">
            <Logo />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-3">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-32" />
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-caption">
                    {getInitials(user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <Button asChild variant="gradient" size="sm" className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
            )}
          </div>

          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
