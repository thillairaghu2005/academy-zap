"use client";

import * as React from "react";
import {
  Atom,
  Braces,
  CloudCog,
  GlobeLock,
  Network,
  Radar,
} from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
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
import { Marquee } from "@/components/motion/marquee";
import { AmbientSection } from "@/components/ui/ambient-section";
import { VerifiedProgression } from "@/components/landing/verified-progression";
import { TrustHighlights } from "@/components/landing/trust-highlights";
import {
  CaseStudySection,
  ComparisonSection,
  StatsBand,
} from "@/components/landing/conversion-sections";
import { ErrorState } from "@/components/shared/error-state";
import { MobileCtaBar } from "@/components/shared/mobile-cta-bar";
import {
  FaqSection,
  FinalCta,
  LiveLearningTicker,
  MarketingProofBar,
  PricingSection,
  TestimonialWall,
} from "@/components/landing/premium-sections";

export interface LandingPageProps {
  courses: CourseSummary[];
  catalogUnavailable?: boolean;
}

const skillCards = [
  { name: "Python", description: "Automate analysis, parse data, and build useful tools.", icon: Braces, tone: "text-primary", href: "/courses" },
  { name: "Threat detection", description: "Turn telemetry into rules that survive real-world noise.", icon: Radar, tone: "text-primary", href: "/courses" },
  { name: "Web application security", description: "Recon, test, and report against deliberately vulnerable apps.", icon: GlobeLock, tone: "text-primary", href: "/labs" },
  { name: "React & TypeScript", description: "Model state and data layers for production interfaces.", icon: Atom, tone: "text-primary", href: "/courses" },
  { name: "Cloud security", description: "Build defensible identity, network, and logging foundations.", icon: CloudCog, tone: "text-primary", href: "/courses" },
  { name: "Linux and networking", description: "Feel at home in the shell, processes, packets, and services.", icon: Network, tone: "text-foreground", href: "/labs" },
] as const;

const visualClasses = [
  "bg-surface-1",
  "bg-surface-1",
  "bg-surface-1",
  "bg-surface-1",
  "bg-surface-1",
  "bg-surface-1",
] as const;

function LandingSections({ courses, catalogUnavailable = false }: LandingPageProps) {
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

  return (
    <>
      <section aria-label="Learning topics" className="border-y border-border bg-surface-1">
        <h2 className="sr-only">Learning topics</h2>
        <div className="py-4">
          <Marquee speed={28} className="[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <span aria-hidden="true" className="flex">
              {skillCards.map((skill) => (
                <span key={skill.name} className="mx-3 inline-flex shrink-0 items-center gap-2 rounded-full glass shadow-sm px-4 py-2 text-xs font-medium text-muted-foreground">
                  <skill.icon className="size-3.5 text-primary" />
                  {skill.name}
                </span>
              ))}
            </span>
          </Marquee>
        </div>
      </section>

      <AmbientSection id="featured-courses" tone="subtle" className="scroll-mt-24 bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionTitle
            title="Courses that build the base for submissions"
            description="The catalog is where you learn the syntax, reasoning, and operating context before you open the Judge or a Lab."
          />
          <div className="mt-8">
            <FilterTabs tabs={tabs} value={activeCategory} onChange={setActiveCategory} label="Filter featured courses by category" />
          </div>
          {catalogUnavailable ? (
            <ErrorState
              title="Course catalog unavailable"
              message="The catalog could not be reached. Retry shortly to request the latest courses."
            />
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.slice(0, 6).map((course, index) => {
                const visualClass =
                  visualClasses[index % visualClasses.length] ??
                   "bg-surface-1";
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
          )}
        </div>
      </AmbientSection>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <VerifiedProgression />
        <div className="mt-8"><TrustHighlights /></div>
      </section>
      <SocialProof />
    </>
  );
}

export function LandingPage({ courses, catalogUnavailable = false }: LandingPageProps) {
  const { user, isLoading } = useSession();
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
        <LandingSections courses={courses} catalogUnavailable={catalogUnavailable} />
        <StatsBand />
        <ComparisonSection />
        <CaseStudySection />
        <PricingSection />
        <TestimonialWall />
        <FaqSection />
        <section className="bg-background px-5 py-10 sm:px-8"><MarketingProofBar /></section>
        <FinalCta />
      </main>
      <MarketingFooter />
      {isLoading || user ? null : <MobileCtaBar analyticsLabel="landing" />}
    </div>
  );
}

function HomeHero() {
  const { user, isLoading } = useSession();
  if (isLoading) return <PersonalizedHero />;
  return user ? <PersonalizedHero /> : <HeroSection />;
}
