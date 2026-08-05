import type { Metadata } from "next";

import { LabSessionClient } from "@/components/lab/session-client";

interface LabSessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export const metadata: Metadata = {
  title: "Lab Session",
  description:
    "Live lab session — terminal, hard-timeout countdown, and server-verified objectives.",
};

export default async function LabSessionPage({
  params,
}: LabSessionPageProps) {
  const { id, sessionId } = await params;
  return <LabSessionClient labId={id} sessionId={sessionId} />;
}
