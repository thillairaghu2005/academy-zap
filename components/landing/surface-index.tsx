import Link from "next/link";
import { BookOpen, Code2, FlaskConical, Trophy } from "lucide-react";

const surfaces = [
  { stage: "F1", name: "Content Engine", detail: "Lessons, syllabus, resume position", href: "/courses", icon: BookOpen },
  { stage: "F2", name: "Judge Engine", detail: "Python submissions and literal verdicts", href: "/judge", icon: Code2 },
  { stage: "F3", name: "Lab Engine", detail: "Terminal sessions and server-checked objectives", href: "/labs", icon: FlaskConical },
  { stage: "F5", name: "Rank Ladder", detail: "Completion XP, Mastery XP, streaks, leagues", href: "/rank", icon: Trophy },
] as const;

/** Build-stage index: these labels map to the actual Zapsters platform plan. */
export function SurfaceIndex() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-0 lg:grid-cols-4">
          {surfaces.map((surface) => (
            <Link
              key={surface.stage}
              href={surface.href}
              className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 border-t border-border px-1 py-5 outline-none transition-colors duration-200 first:border-t-0 hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring lg:border-l lg:border-t-0 lg:px-5 lg:first:border-l-0 motion-reduce:transition-none"
            >
              <span className="font-mono text-xs font-semibold text-primary">{surface.stage}</span>
              <span>
                <span className="block font-display font-semibold">{surface.name}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{surface.detail}</span>
              </span>
              <surface.icon className="mt-0.5 size-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
