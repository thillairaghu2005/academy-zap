import type { Metadata } from "next";

import { CartClient } from "@/components/commerce/cart-client";

export const metadata: Metadata = {
  title: "Your cart",
  description:
    "Review your cart and check out through the provider's hosted payment page.",
};

export default function CartPage() {
  return <CartClient />;
}
