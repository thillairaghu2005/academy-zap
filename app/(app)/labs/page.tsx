import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Labs",
  description: "Lab Engine — TryHackMe-shaped virtual labs. Landing in F3.",
};

export default function LabsPage() {
  const surface = getSurface("labs");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
