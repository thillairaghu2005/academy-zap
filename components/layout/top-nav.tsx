"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/side-nav";
import { UserMenu } from "@/components/layout/user-menu";
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

export function TopNav() {
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <MobileNav />

        <Logo />

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
          {/* Search — catalog search (mock Meilisearch shape) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden text-muted-foreground md:inline-flex"
                aria-label="Search courses"
              >
                <Link href="/courses">
                  <Search />
                  <span>Search</span>
                  <kbd className="ml-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    ⌘K
                  </kbd>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search the course catalog</TooltipContent>
          </Tooltip>

          {/* Notifications — decorative until push lands */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="Notifications (mock)"
                >
                  <Bell />
                </Button>
                <span className="pointer-events-none absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Notifications — mock until push lands</TooltipContent>
          </Tooltip>

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
