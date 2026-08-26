import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { LastUpdated } from "@/components/shared/last-updated";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "The rules for using Zapsters: accounts, acceptable use, subscriptions and the 30-day money-back window, content licensing, and disclaimers.",
  path: "/legal/terms",
  index: true,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <PageContainer as="main" id="main-content">
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
        <LastUpdated date="2026-08-24" className="mt-4" />
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          Welcome to Zapsters. By creating an account or using the platform, you agree to these terms.
        </p>

        <Section title="The service">
          <p>
            Zapsters is an online learning platform offering courses, coding-judge practice problems, virtual labs,
            assessments, and gamified progression. The platform may be deployed in demo mode, in which part of the
            experience runs on local demonstration services; where that is the case it is disclosed in the product
            (see the pricing FAQ).
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You are responsible for the accuracy of your account details and for keeping your credentials secure. One
            account per person; do not share your account. You must be at least 13 years old to create an account.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Use Zapsters only for lawful learning. Do not attempt to disrupt, overload, or gain unauthorized access to
            the platform or its grading infrastructure, do not scrape or resell content or credentials, and do not
            misrepresent authorship of submitted work. We may suspend accounts that abuse the service.
          </p>
        </Section>

        <Section title="Plans, billing, and refunds">
          <p>
            Plans and current prices are listed on the{" "}
            <Link href="/pricing" className="font-medium text-primary hover:underline">
              Pricing page
            </Link>
            . Paid plans bill monthly or yearly as selected, and you can cancel at any time; cancellation stops future
            billing. Purchases carry the 30-day money-back guarantee advertised on the pricing page — request a refund
            within 30 days of a charge through Support. Payments are processed by a third-party payment provider on
            its hosted checkout; in sandbox deployments no real charges occur.
          </p>
        </Section>

        <Section title="Content and license">
          <p>
            Courses, problems, labs, and other materials are owned by Zapsters or their instructors and are protected
            by law. While your subscription is active, you receive a personal, non-exclusive, non-transferable license
            to access them for your own learning. Certificates and verified credentials record demonstrated progress
            and may be publicly verifiable through their verification links.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; While we aim for accurate,
            practical material, we do not warrant that content is error-free or fit for a particular purpose, and we
            do not guarantee specific career, certification, or income outcomes. Availability may change as features
            ship.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms as the product evolves. Material changes will be reflected on this page with an
            updated date, and continued use after changes means you accept the revised terms.
          </p>
        </Section>

        <Section title="Governing law and contact">
          <p>
            These terms are governed by the laws of <span className="font-mono text-xs">[governing jurisdiction — to be configured]</span>.
            Questions? Open a ticket via{" "}
            <Link href="/support" className="font-medium text-primary hover:underline">
              Support
            </Link>{" "}
            or write to <span className="font-mono text-xs">[contact email — to be configured]</span>.
          </p>
        </Section>
      </div>
    </PageContainer>
  );
}
