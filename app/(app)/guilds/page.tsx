import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Guilds",
  description: "Gamification — guild boards and combined XP rollups. Landing in F5.",
};

export default function GuildsPage() {
  const surface = getSurface("guilds");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
