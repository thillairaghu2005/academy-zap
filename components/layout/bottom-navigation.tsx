"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CodeXml, FlaskConical, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/side-nav";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/labs", label: "Labs", icon: FlaskConical },
  { href: "/judge", label: "Judge", icon: CodeXml },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border/80 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_10px_34px_rgb(17_24_39_/_12%)] backdrop-blur-xl lg:hidden" aria-label="Mobile primary navigation">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className={cn("size-5", active && "stroke-[2.25]")} /><span>{label}</span></Link>;
        })}
        <MobileNav variant="bottom" />
      </div>
    </nav>
  );
}
