import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Gamification — global and guild leaderboards. Landing in F5.",
};

export default function LeaderboardsPage() {
  const surface = getSurface("leaderboards");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
