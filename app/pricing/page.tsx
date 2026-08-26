import type { Metadata } from "next";

import { MarketingFooter } from "@/components/landing/marketing-footer";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { FaqSection, FinalCta, PricingSection } from "@/components/landing/premium-sections";
import { MobileCtaBar } from "@/components/shared/mobile-cta-bar";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free, then upgrade to Pro for all courses, labs, and assessments, or Teams for group practice. 30-day money-back guarantee on paid plans.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <MarketingNav />
      <main>
        <PricingSection standalone headingAs="h1" />
        <FaqSection />
        <FinalCta />
      </main>
      <MarketingFooter />
      <MobileCtaBar analyticsLabel="pricing" />
    </div>
  );
}
