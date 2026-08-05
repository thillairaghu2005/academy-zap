import type { Metadata } from "next";

import { BillingClient } from "@/components/commerce/billing-client";

export const metadata: Metadata = {
  title: "Subscription & seats",
  description:
    "B2B plan, seat management and next invoice (mock read model).",
};

export default function BillingPage() {
  return <BillingClient />;
}
