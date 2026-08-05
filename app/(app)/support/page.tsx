import type { Metadata } from "next";

import { MyTicketsClient } from "@/components/support/my-tickets-client";

export const metadata: Metadata = {
  title: "Support",
  description: "Your support tickets.",
};

export default function SupportPage() {
  return <MyTicketsClient />;
}
