import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VerifyClient } from "@/components/gamification/verify-client";

export const metadata: Metadata = {
  title: "Credential Verify",
  description:
    "Independent credential re-verification — verified, flagged and revoked states.",
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;
  if (!credentialId || credentialId.includes("..")) notFound();
  return <VerifyClient credentialId={credentialId} />;
}
