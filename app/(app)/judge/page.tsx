import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Judge",
  description: "Judge Engine — HackerRank-shaped code judge. Landing in F2.",
};

export default function JudgePage() {
  const surface = getSurface("judge");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
