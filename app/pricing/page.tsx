import type { Metadata } from "next";

import { MarketingFooter } from "@/components/landing/marketing-footer";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { FaqSection, FinalCta, PricingSection } from "@/components/landing/premium-sections";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple Zapsters plans for focused, practical learning.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <MarketingNav />
      <main>
        <PricingSection standalone />
        <FaqSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
