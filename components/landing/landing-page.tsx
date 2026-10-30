"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CourseSummary } from "@/lib/contracts/content";
import { FeaturedCourseCard } from "@/components/landing/featured-course-card";
import { FilterTabs } from "@/components/landing/filter-tabs";
import { HeroSection } from "@/components/landing/hero-section";
import { LearningLoop } from "@/components/landing/learning-loop";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { PersonalizedHero } from "@/components/landing/personalized-hero";
import { useSession } from "@/components/providers/session-provider";
import { AmbientSection } from "@/components/ui/ambient-section";
import { Button } from "@/components/ui/button";
import {
  CaseStudySection,
  ComparisonSection,
  StatsBand,
} from "@/components/landing/conversion-sections";
import { SocialProof } from "@/components/landing/social-proof";
import { ErrorState } from "@/components/shared/error-state";
import { MobileCtaBar } from "@/components/shared/mobile-cta-bar";
import {
  FaqSection,
  FinalCta,
  TestimonialWall,
} from "@/components/landing/premium-sections";

export interface LandingPageProps {
  courses: CourseSummary[];
  catalogUnavailable?: boolean;
}

function LandingSections({ courses, catalogUnavailable = false }: LandingPageProps) {
  const tracks = [
    { value: "all", label: "All Specializations" },
    { value: "Cybersecurity", label: "Cybersecurity & Defense" },
    { value: "Web Development", label: "Systems & Web" },
    { value: "Cloud & DevOps", label: "Cloud & Infrastructure" },
  ];
  const [activeCategory, setActiveCategory] = React.useState("all");

  const filteredCourses = React.useMemo(() => {
    if (activeCategory === "all") return courses.slice(0, 8);
    const matched = courses.filter((c) =>
      c.category.toLowerCase().includes(activeCategory.toLowerCase()),
    );
    return (matched.length > 0 ? matched : courses).slice(0, 8);
  }, [courses, activeCategory]);

  return (
    <AmbientSection id="featured-courses" tone="subtle" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Technical Specializations</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Curated engineering curriculums
            </h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Built by senior practitioners with hands-on labs, interactive challenges, and verified skill milestones.
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:inline-flex shrink-0">
            <Link href="/courses">
              Explore catalog
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        
        <div className="mt-6">
          <FilterTabs tabs={tracks} value={activeCategory} onChange={setActiveCategory} label="Filter courses by track" />
        </div>
        
        {catalogUnavailable ? (
          <ErrorState
            title="Course catalog unavailable"
            message="The catalog could not be reached. Retry shortly to request the latest courses."
          />
        ) : (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filteredCourses.map((course, index) => (
                <FeaturedCourseCard
                  key={course.id}
                  course={course}
                  index={index}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center sm:hidden">
              <Button variant="outline" asChild className="w-full">
                <Link href="/courses">
                  Explore full catalog
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AmbientSection>
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
        <SocialProof />
        <CaseStudySection />
        <TestimonialWall />
        <FaqSection />
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
