"use client";

import * as React from "react";
import {
  Cloud,
  Code2,
  Cpu,
  FileCode2,
  Globe2,
  Layers3,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { CategoryCard } from "@/components/landing/category-card";
import { FeaturedCourseCard } from "@/components/landing/featured-course-card";
import { FilterTabs } from "@/components/landing/filter-tabs";
import { HeroSection } from "@/components/landing/hero-section";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { PracticeBanner } from "@/components/landing/practice-banner";
import { SectionTitle } from "@/components/landing/section-title";
import { SkillCard } from "@/components/landing/skill-card";
import { VerifiedProgression } from "@/components/landing/verified-progression";

export interface LandingPageProps {
  courses: CourseSummary[];
}

const categoryVisuals: Record<string, { icon: typeof Code2; tone: string }> = {
  Cybersecurity: { icon: ShieldCheck, tone: "bg-primary" },
  "Web Development": { icon: Globe2, tone: "bg-xp-completion" },
  "Cloud & DevOps": { icon: Cloud, tone: "bg-xp-mastery" },
  Programming: { icon: Code2, tone: "bg-foreground" },
};

const skillCards = [
  { name: "Python", description: "Automate analysis, parse data, and build useful tools.", icon: FileCode2, tone: "bg-primary", href: "/courses" },
  { name: "Threat detection", description: "Turn telemetry into rules that survive real-world noise.", icon: ShieldCheck, tone: "bg-xp-mastery", href: "/courses" },
  { name: "Web application security", description: "Recon, test, and report against deliberately vulnerable apps.", icon: LockKeyhole, tone: "bg-danger", href: "/labs" },
  { name: "React & TypeScript", description: "Model state and data layers for production interfaces.", icon: Layers3, tone: "bg-xp-completion", href: "/courses" },
  { name: "Cloud security", description: "Build defensible identity, network, and logging foundations.", icon: ServerCog, tone: "bg-success", href: "/courses" },
  { name: "Linux and networking", description: "Feel at home in the shell, processes, packets, and services.", icon: Terminal, tone: "bg-foreground", href: "/labs" },
] as const;

const visualClasses = [
  "bg-gradient-to-br from-primary to-xp-mastery",
  "bg-gradient-to-br from-foreground to-primary",
  "bg-gradient-to-br from-xp-completion to-primary",
  "bg-gradient-to-br from-xp-mastery to-danger",
  "bg-gradient-to-br from-success to-xp-completion",
  "bg-gradient-to-br from-primary to-foreground",
] as const;

function LandingSections({ courses }: LandingPageProps) {
  const [activeCategory, setActiveCategory] = React.useState("All");
  const categories = courses.reduce<{ name: string; count: number }[]>((result, course) => {
    const existing = result.find((category) => category.name === course.category);
    if (existing) {
      existing.count += 1;
    } else {
      result.push({ name: course.category, count: 1 });
    }
    return result;
  }, []);
  const filteredCourses = activeCategory === "All"
    ? courses
    : courses.filter((course) => course.category === activeCategory);
  const tabs = [{ value: "All", label: "All skills" }, ...categories.map((category) => ({ value: category.name, label: category.name }))];

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      document.getElementById("featured-courses")?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionTitle
          eyebrow="Find your starting point"
          title="Build a learning path that feels like yours."
          description="Choose a discipline, then switch between guided content and hands-on practice whenever you are ready."
        />
        <div className="mt-8 flex gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const visual = categoryVisuals[category.name] ?? { icon: Cpu, tone: "bg-primary" };
            return (
              <CategoryCard
                key={category.name}
                name={category.name}
                count={category.count}
                icon={visual.icon}
                tone={visual.tone}
                onSelect={() => selectCategory(category.name)}
              />
            );
          })}
        </div>
      </section>

      <section id="featured-courses" className="scroll-mt-24 border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionTitle
            eyebrow="Featured courses"
            title="Start with something worth finishing."
            description="Real courses from the Zapsters catalog, with a next step waiting when the lesson ends."
          />
          <div className="mt-8">
            <FilterTabs tabs={tabs} value={activeCategory} onChange={setActiveCategory} label="Filter featured courses by category" />
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.slice(0, 6).map((course, index) => {
              const visualClass =
                visualClasses[index % visualClasses.length] ??
                "bg-gradient-to-br from-primary to-xp-mastery";
              return (
                <FeaturedCourseCard
                  key={course.id}
                  course={course}
                  visualClass={visualClass}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <PracticeBanner />
      </section>

      <section className="border-y border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionTitle
            eyebrow="Popular skills"
            title="Go deeper when you know what you want to sharpen."
            description="These subjects are grounded in the current course, problem, and lab catalog."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skillCards.map((skill) => (
              <SkillCard key={skill.name} {...skill} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <VerifiedProgression />
      </section>
    </>
  );
}

export function LandingPage({ courses }: LandingPageProps) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main-content">
        <HeroSection />
        <LandingSections courses={courses} />
      </main>
      <MarketingFooter />
    </div>
  );
}
