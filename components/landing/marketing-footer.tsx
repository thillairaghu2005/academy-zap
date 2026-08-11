import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/layout/logo";

const columns = [
  {
    title: "Do the work",
    links: [
      ["Course catalog", "/courses"],
      ["Python Judge", "/judge"],
      ["Virtual lab sessions", "/labs"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Track the climb",
    links: [
      ["Rank ladder", "/rank"],
      ["Global leaderboard", "/leaderboards"],
      ["Guild boards", "/guilds"],
    ],
  },
  {
    title: "Keep your account",
    links: [
      ["Sign in", "/login"],
      ["Create a Zapsters account", "/register"],
      ["Open a support ticket", "/support"],
    ],
  },
] as const;

/** Marketing footer intentionally uses only routes and support surfaces present in the app. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8 lg:py-16">
        <div>
          <Logo size="sm" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">
            Submit solutions, verify objectives, and see the work accumulate in your rank.
          </p>
          <p className="mt-8 font-mono text-xs text-muted-foreground/70">© 2026 Zapsters / learn-build-climb</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-small font-semibold">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                       className="text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
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
          <span>Next command: make a submission.</span>
          <Link href="/courses" className="inline-flex items-center gap-1 font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Open the catalog <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
