import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VerifyClient } from "@/components/gamification/verify-client";
import { verifyBadge } from "@/lib/api/gamification";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ credentialId: string }> }): Promise<Metadata> {
  const { credentialId } = await params;
  try { const credential = await verifyBadge(credentialId); return buildMetadata({ title: `${credential.badge_name} · Credential`, description: `Verify ${credential.badge_name} awarded to ${credential.subject.display_name}.`, path: `/rank/verify/${credentialId}`, keywords: ["certificate", "credential", credential.claim.category] }); }
  catch { return buildMetadata({ title: "Credential Verify", description: "Independent credential re-verification.", path: `/rank/verify/${credentialId}` }); }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  if (!credentialId || credentialId.includes("..")) notFound();
  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "EducationalOccupationalCredential", credentialCategory: "Zapsters verified achievement", identifier: credentialId, recognizedBy: { "@type": "Organization", name: "Zapsters" } }} /><VerifyClient credentialId={credentialId} /></>;
}
