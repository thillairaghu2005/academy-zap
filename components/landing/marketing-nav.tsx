"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { Logo } from "@/components/layout/logo";
import { RankXpChip } from "@/components/gamification/rank-xp-chip";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/judge", label: "Judge" },
  { href: "/labs", label: "Labs" },
  { href: "/rank", label: "Rank" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Public navigation keeps the landing page distinct from the learner shell. */
export function MarketingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 px-3 py-3 transition-all duration-200 motion-reduce:transition-none sm:px-5",
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-0 sm:px-1 lg:h-16">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open site navigation"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm p-0">
            <SheetHeader className="border-b border-border px-6 pb-5 pt-6">
              <SheetTitle className="font-display text-h3 text-left">Surface index</SheetTitle>
              <SheetDescription className="text-left">
                Courses, Judge, Labs, and the Rank Ladder.
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                   className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-border pt-4">
                <GlobalSearch className="inline-flex w-full justify-start" />
              </div>
              <div className="mt-3 grid gap-2">
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : user ? (
                  <UserMenu />
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setMenuOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button variant="gradient" asChild>
                      <Link href="/register" onClick={() => setMenuOpen(false)}>
                        Join Zapsters
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo size="sm" eager className="lg:[&>img]:h-10" />

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
           {links.map((link) => (
             <Link
               key={link.href}
               href={link.href}
               aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}
                className={cn(
                    "on-glass relative rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === link.href || pathname.startsWith(`${link.href}/`) ? "text-foreground after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground",
                )}
             >
               {link.label}
             </Link>
           ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <RankXpChip />
          {isLoading ? (
            <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
          ) : user ? (
            <UserMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              >
                Sign in
              </Link>
                 <Button variant="default" size="sm" asChild>
                <Link href="/register">Join Zapsters</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
