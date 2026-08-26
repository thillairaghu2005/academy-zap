import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { LastUpdated } from "@/components/shared/last-updated";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Zapsters handles your data: what is stored in your browser, how demo accounts work, and how payments and analytics are treated.",
  path: "/legal/privacy",
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

export default function PrivacyPage() {
  return (
    <PageContainer as="main" id="main-content">
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
        <LastUpdated date="2026-08-24" className="mt-4" />
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          This policy explains what Zapsters stores, why, and what never leaves your device. It applies to this
          website and the learning platform it hosts.
        </p>

        <Section title="The short version">
          <p>
            Zapsters runs as a frontend-first demo deployment. Your account details, learning progress, cart, and
            activity events are stored locally in your own browser. They are not transmitted to a Zapsters server,
            sold, or shared with advertisers.
          </p>
        </Section>

        <Section title="What we store and where">
          <p>
            When you create an account, browse courses, or track progress, the following is kept in your
            browser&rsquo;s local storage: your display name, email address, demo credentials, enrolled courses,
            completed lessons, assessment attempts, saved items, cart contents, and product analytics events (a
            capped, first-party event log used to power in-app statistics).
          </p>
          <p>
            Campaign parameters (for example utm_source) may be kept in session storage for the duration of your
            visit. Clearing your browser storage removes all of this data permanently.
          </p>
        </Section>

        <Section title="Cookies and consent">
          <p>
            Zapsters does not use third-party advertising or cross-site tracking cookies. We store a small consent
            record so we can honor your cookie-banner choice. Optional, non-essential measurement (for example a
            privacy-respecting analytics provider) is only loaded after you accept non-essential cookies; choosing
            &ldquo;Essential only&rdquo; keeps everything strictly functional. You can change your choice at any time
            from the footer&rsquo;s Cookie settings link.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Paid plans are processed by a third-party payment provider on its hosted checkout page. Card numbers and
            payment credentials are entered on the provider&rsquo;s infrastructure and are never sent to or stored by
            Zapsters. In the current sandbox deployment no real charges are made.
          </p>
        </Section>

        <Section title="Data we do not collect">
          <p>
            We do not collect precise location, contacts, biometric data, or browsing histories from other websites,
            and we do not operate advertising pixels.
          </p>
        </Section>

        <Section title="Children">
          <p>Zapsters is not directed at children under 13, and we do not knowingly collect their personal data.</p>
        </Section>

        <Section title="Your choices">
          <p>
            You can clear all locally stored Zapsters data at any time through your browser settings, sign out from
            your account menu, and withdraw cookie consent from the footer. Because data lives on your device,
            clearing it is immediate and complete.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy questions, open a ticket via{" "}
            <Link href="/support" className="font-medium text-primary hover:underline">
              Support
            </Link>
            , or email our team at <span className="font-mono text-xs">[support email — to be configured]</span>.
          </p>
        </Section>
      </div>
    </PageContainer>
  );
}
