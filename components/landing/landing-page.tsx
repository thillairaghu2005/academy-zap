"use client";

import * as React from "react";

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
  PricingSection,
  TestimonialWall,
} from "@/components/landing/premium-sections";

export interface LandingPageProps {
  courses: CourseSummary[];
  catalogUnavailable?: boolean;
}

function LandingSections({ courses, catalogUnavailable = false }: LandingPageProps) {
  const udemyTabs = [
    { value: "AI", label: "Artificial Intelligence (AI)" },
    { value: "Python", label: "Python" },
    { value: "Excel", label: "Microsoft Excel" },
    { value: "Agentic", label: "AI Agents & Agentic AI" },
    { value: "Marketing", label: "Digital Marketing" },
    { value: "AWS", label: "Amazon AWS" },
  ];
  const [activeCategory, setActiveCategory] = React.useState("AI");

  // Determine which 4 courses to show based on the active tab index
  const activeTabIndex = Math.max(0, udemyTabs.findIndex(t => t.value === activeCategory));
  // Ensure we don't go out of bounds of the courses array
  const maxStartIndex = Math.max(0, courses.length - 4);
  const startIndex = (activeTabIndex * 4) % (maxStartIndex || 1);
  const demoCourses = courses.slice(startIndex, startIndex + 4);

  return (
    <AmbientSection id="featured-courses" tone="subtle" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Skills to transform your career and life
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From critical workplace skills to technical topics, Udemy supports your professional development.
          </p>
        </div>
        
        <div className="mt-8">
          <FilterTabs tabs={udemyTabs} value={activeCategory} onChange={setActiveCategory} label="Filter courses by category" />
        </div>
        
        {catalogUnavailable ? (
          <ErrorState
            title="Course catalog unavailable"
            message="The catalog could not be reached. Retry shortly to request the latest courses."
          />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {demoCourses.map((course, index) => {
              // Override category to match the selected tab just for visual effect
              const displayCourse = { ...course, category: udemyTabs.find(t => t.value === activeCategory)?.label || course.category };
              return (
                <FeaturedCourseCard
                  key={`${activeCategory}-${course.id}`} // ensure remounting if id is the same to trigger animations
                  course={displayCourse}
                  index={index}
                />
              );
            })}
          </div>
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
        <CaseStudySection />
        <PricingSection />
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
