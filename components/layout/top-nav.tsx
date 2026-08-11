"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

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
import { useSession } from "@/components/providers/session-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationCenter } from "@/components/layout/notification-center";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { RankXpChip } from "@/components/gamification/rank-xp-chip";
import { Logo } from "@/components/layout/logo";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  judge: "Judge",
  labs: "Labs",
  assessments: "Assessments",
  rank: "Rank",
  leaderboards: "Leaderboards",
  guilds: "Guilds",
  mentors: "Mentors",
  cart: "Cart",
  checkout: "Checkout",
  billing: "Billing",
  profile: "Profile",
  learn: "Learn",
  session: "Session",
  attempt: "Attempt",
};

function TopNavBreadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-muted-foreground"
    >
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label =
          BREADCRUMB_LABELS[segment] ??
          decodeURIComponent(segment).replace(/[-_]/g, " ");
        const current = index === segments.length - 1;

        return (
          <span key={href} className="flex min-w-0 shrink-0 items-center gap-1.5">
            {index > 0 ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}
            {current ? (
              <span className="max-w-36 truncate font-medium text-foreground" aria-current="page">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="max-w-36 truncate rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { user, isLoading } = useSession();
  const section = pathname.split("/").filter(Boolean)[0];
  const sectionLabel = section
    ? BREADCRUMB_LABELS[section] ?? section.replace(/[-_]/g, " ")
    : "Dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 px-3 py-2 backdrop-blur sm:px-5 lg:px-6">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-0 sm:px-1">
        <MobileNav />

        <Logo size="sm" className="hidden lg:flex lg:mr-2" />

        <span className="shrink-0 font-display text-small font-semibold lg:hidden">
          {sectionLabel}
        </span>

        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
           <div className="hidden min-w-0 shrink-0 lg:flex">
             <TopNavBreadcrumbs pathname={pathname} />
           </div>
           <GlobalSearch className="w-full justify-start rounded-xl bg-surface-1/70" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">

          {/* Offline status — visible only while disconnected */}
          <OfflineIndicator />

          {/* Cart — live item count badge (Task 2) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <CartBadge />
            </TooltipTrigger>
            <TooltipContent>Cart</TooltipContent>
          </Tooltip>

          {/* Notification center — mock event feed until push/SSE lands */}
          <NotificationCenter />

          <KeyboardShortcuts />

          <Tooltip>
            <TooltipTrigger asChild>
              <RankXpChip />
            </TooltipTrigger>
            <TooltipContent>Rank and XP progress</TooltipContent>
          </Tooltip>

          <div className="ml-1">
            {isLoading ? (
              <Skeleton className="h-9 w-36 rounded-full" />
            ) : user ? (
              <UserMenu />
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
