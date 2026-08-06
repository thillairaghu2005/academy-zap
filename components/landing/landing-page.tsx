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
import { LearningLoop } from "@/components/landing/learning-loop";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { PersonalizedHero } from "@/components/landing/personalized-hero";
import { useSession } from "@/components/providers/session-provider";
import { SectionTitle } from "@/components/landing/section-title";
import { SocialProof } from "@/components/landing/social-proof";
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
          title="Course catalog / choose your base"
          description="Start with the subject you want to use in a submission, a lab session, or your next rank climb."
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
            title="Courses that build the base for submissions"
            description="The catalog is where you learn the syntax, reasoning, and operating context before you open the Judge or a Lab."
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
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionTitle
            title="Topics you can submit, shell into, and climb with"
            description="Python, detection, web security, cloud controls, and the systems underneath them are all connected to a working surface."
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
      <SocialProof />
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
        <HomeHero />
        <LearningLoop />
        <LandingSections courses={courses} />
      </main>
      <MarketingFooter />
    </div>
  );
}

function HomeHero() {
  const { user, isLoading } = useSession();
  if (isLoading) return <PersonalizedHero />;
  return user ? <PersonalizedHero /> : <HeroSection />;
}
