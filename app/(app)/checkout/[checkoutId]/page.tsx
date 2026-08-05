import type { Metadata } from "next";

import { CheckoutClient } from "@/components/commerce/checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Complete your purchase through the provider's hosted checkout.",
};

export default async function CheckoutSessionPage({
  params,
}: {
  params: Promise<{ checkoutId: string }>;
}) {
  const { checkoutId } = await params;
  return <CheckoutClient checkoutId={checkoutId} />;
}
