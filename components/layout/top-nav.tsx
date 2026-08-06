"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/src/components/Logo/Logo";
import { MobileNav } from "@/components/layout/side-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { CartBadge } from "@/components/commerce/cart-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/lib/navigation";
import { useSession } from "@/components/providers/session-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationCenter } from "@/components/layout/notification-center";
import { RankXpChip } from "@/components/gamification/rank-xp-chip";

export function TopNav() {
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav />

        <Logo
          size="sm"
          eager
          className="p-1.5 [&>img]:h-8 sm:[&>img]:h-9 lg:[&>img]:h-11"
        />

        {/* Primary learning surfaces (desktop) */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Unified search — courses, problems, and labs */}
          <GlobalSearch />

          {/* Cart — live item count badge (Task 2) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <CartBadge />
            </TooltipTrigger>
            <TooltipContent>Cart</TooltipContent>
          </Tooltip>

          {/* Notification center — mock event feed until push/SSE lands */}
          <NotificationCenter />

          <RankXpChip />

          <div className="ml-1">
            {isLoading ? (
              <Skeleton className="h-9 w-36 rounded-full" />
            ) : user ? (
              <UserMenu />
            ) : (
              <Button variant="gradient" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
