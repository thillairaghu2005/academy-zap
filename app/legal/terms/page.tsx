import { PageContainer } from "@/components/shared/page-container";
import { LastUpdated } from "@/components/shared/last-updated";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Zapsters.",
};

export default function TermsPage() {
  return (
    <PageContainer as="main" id="main-content">
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
        <LastUpdated date="2026-08-17" className="mt-4" />
        <div className="prose prose-sm mt-8 max-w-none">
          <p>
            Welcome to Zapsters. By using our platform, you agree to these terms of service.
          </p>
          <h2>Usage</h2>
          <p>You agree to use our platform responsibly and not to abuse our systems.</p>
        </div>
      </div>
    </PageContainer>
  );
}
