import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Rank Ladder",
  description: "Gamification — rank ladder, dual XP tracks, streaks. Landing in F5.",
};

export default function RankPage() {
  const surface = getSurface("rank");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
