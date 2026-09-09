import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { FaqSection } from "@/components/landing/premium-sections";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Get answers to the most common questions about Zapsters: pricing, labs, the Judge engine, certificates, and how progression works.",
  alternates: { canonical: "/faq" },
  robots: { index: true, follow: true },
};

export default function FaqPage() {
  return (
    <div className="min-h-dvh bg-background">
      <MarketingNav />

      <main id="main-content">
        {/* Hero */}
        <section className="border-b border-border bg-surface-1">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Questions, answered
            </p>
            <h1 className="mt-3 font-display font-light text-4xl tracking-[-0.045em] sm:text-5xl">
              A clear start, without the fine print.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              If something is still unclear after reading through these, reach out via the{" "}
              <Link href="/support/new" className="text-primary hover:underline">
                support form
              </Link>{" "}
              and we will get back to you.
            </p>
          </div>
        </section>

        {/* FAQ accordion — reuses the same component used on the landing page */}
        <FaqSection />

        {/* CTA */}
        <section className="bg-background border-t border-border">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8">
            <p className="text-sm text-muted-foreground">
              Ready to get started?
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="gradient" size="lg" asChild>
                <Link href="/register">Create a free account</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/courses">Browse the catalog</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
