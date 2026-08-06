"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

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
import { useSession } from "@/components/providers/session-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationCenter } from "@/components/layout/notification-center";
import { RankXpChip } from "@/components/gamification/rank-xp-chip";

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

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav />

        <Logo
          size="sm"
          eager
          className="p-1.5 [&>img]:h-8 sm:[&>img]:h-9 lg:[&>img]:h-11"
        />

        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
          <div className="hidden min-w-0 shrink-0 lg:flex">
            <TopNavBreadcrumbs pathname={pathname} />
          </div>
          <GlobalSearch className="w-full justify-start" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">

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
