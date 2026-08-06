import type { Metadata } from "next";

import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = buildMetadata({ title: "Profile", description: "Manage your Zapsters learning identity, goals, skills, and profile strength.", path: "/profile", keywords: ["learner profile", "learning goals", "skills"] });

export default function ProfilePage() {
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "ProfilePage", name: "Zapsters learner profile", isPartOf: { "@type": "WebSite", name: "Zapsters" } }} /><ProfilePageClient /></>;
}
