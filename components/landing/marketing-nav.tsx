"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/judge", label: "Judge" },
  { href: "/labs", label: "Labs" },
  { href: "/rank", label: "Rank" },
] as const;

/** Public navigation keeps the landing page distinct from the learner shell. */
export function MarketingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent transition-all duration-300 motion-reduce:transition-none",
        scrolled && "border-border/70 bg-background/85 shadow-sm backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
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
              <SheetTitle className="font-display text-left">Surface index</SheetTitle>
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
                  className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-border pt-4">
                <GlobalSearch className="inline-flex w-full justify-start" />
              </div>
              <div className="mt-3 grid gap-2">
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
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Sign in
          </Link>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/register">Join Zapsters</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
