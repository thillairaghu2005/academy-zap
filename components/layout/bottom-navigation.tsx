"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CodeXml, FlaskConical, Home, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/labs", label: "Labs", icon: FlaskConical },
  { href: "/judge", label: "Judge", icon: CodeXml },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden" aria-label="Mobile primary navigation">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className={cn("size-5", active && "stroke-[2.25]")} /><span>{label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
