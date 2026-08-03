import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSurface } from "@/lib/surfaces";
import { SurfaceStub } from "@/components/shared/surface-stub";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Commerce — cart and hosted checkout embeds. Landing in F6.",
};

export default function CheckoutPage() {
  const surface = getSurface("checkout");
  if (!surface) notFound();
  return <SurfaceStub surface={surface} />;
}
