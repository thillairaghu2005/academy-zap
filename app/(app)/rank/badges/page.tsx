import type { Metadata } from "next";

import { BadgeWall } from "@/components/gamification/badge-wall";

export const metadata: Metadata = {
  title: "Badge Wall",
  description:
    "Verifiable credentials — verified, flagged and revoked badge states with public verify links.",
};

export default function BadgesPage() {
  return <BadgeWall />;
}
