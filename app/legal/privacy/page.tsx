import { PageContainer } from "@/components/shared/page-container";
import { LastUpdated } from "@/components/shared/last-updated";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Zapsters.",
};

export default function PrivacyPage() {
  return (
    <PageContainer as="main" id="main-content">
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
        <LastUpdated date="2026-08-17" className="mt-4" />
        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
          <p>
            At Zapsters, we take your privacy seriously. This privacy policy explains how we collect, use, and protect your personal data when you use our platform.
          </p>
          <h2>Information We Collect</h2>
          <p>We only collect the information needed to provide you with a great learning experience.</p>
        </div>
      </div>
    </PageContainer>
  );
}
