import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/layout/logo";

const columns = [
  {
    title: "Learn",
    links: [
      ["Course catalog", "/courses"],
      ["Virtual labs", "/labs"],
      ["Assessments", "/assessments"],
    ],
  },
  {
    title: "Practice",
    links: [
      ["Judge Engine", "/judge"],
      ["Leaderboards", "/leaderboards"],
      ["Guilds", "/guilds"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Sign in", "/login"],
      ["Create account", "/register"],
      ["Support", "/support"],
    ],
  },
] as const;

/** Marketing footer intentionally uses only routes and support surfaces present in the app. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8 lg:py-16">
        <div>
          <Logo size="sm" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">
            Learn. Build. Climb. A practical learning platform for people who want their work to count.
          </p>
          <p className="mt-8 text-xs text-muted-foreground/70">© 2026 Zapsters. Built for the climb.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>More learning surfaces are on the way.</span>
          <Link href="/courses" className="inline-flex items-center gap-1 font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Browse courses <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
