import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin & CMS — authoring, review and audit. Landing in F7 (lowest priority).",
};

export default function AdminPage() {
  const surface = getSurface("admin");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
