"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { m as motion } from "framer-motion";

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
  { href: "/courses", label: "Explore" },
  { href: "/pricing", label: "Subscribe" },
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
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-0 sm:px-1 lg:h-16">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              aria-label="Open site navigation"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm p-0">
            <SheetHeader className="border-b border-border px-6 pb-5 pt-6">
              <SheetTitle className="font-display text-h3 text-left">Surface index</SheetTitle>
              <SheetDescription className="text-left">
                Courses and Pricing.
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                   className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium outline-none transition-all duration-200 hover:bg-primary/5 hover:text-foreground hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-border pt-4">
                <GlobalSearch className="inline-flex w-full justify-start rounded-full h-11" />
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
                        Log In
                      </Link>
                    </Button>
                    <Button variant="gradient" asChild>
                      <Link href="/register" onClick={() => setMenuOpen(false)}>
                        Sign up
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <Logo size="lg" eager className="shrink-0" />

        <nav className="ml-2 hidden items-center gap-1 lg:flex shrink-0" aria-label="Primary navigation">
           {links.map((link) => {
             const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
             return (
               <Link
                 key={link.href}
                 href={link.href}
                 aria-current={isActive ? "page" : undefined}
                 className={cn(
                   "on-glass relative rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all duration-200 hover:bg-primary/5 hover:text-foreground hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring",
                   isActive ? "text-foreground" : "text-muted-foreground",
                 )}
               >
                 {link.label}
                 {isActive && (
                   <motion.div
                     layoutId="marketing-nav-underline"
                     className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-primary"
                     transition={{ type: "spring", stiffness: 350, damping: 30 }}
                   />
                 )}
               </Link>
             );
           })}
        </nav>

        <div className="flex flex-1 items-center justify-center px-4 lg:px-8">
           <GlobalSearch className="hidden sm:flex w-full max-w-[600px] justify-start rounded-full border border-border/50 bg-secondary/40 px-4 hover:bg-secondary/60 h-11 text-sm font-normal text-muted-foreground" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {isLoading ? (
            <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
          ) : user ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="outline" className="hidden sm:inline-flex rounded-sm font-bold bg-transparent border-primary/20 hover:bg-primary/5 h-10 px-5" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button variant="default" className="rounded-sm font-bold h-10 px-5" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
