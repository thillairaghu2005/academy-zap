import type { Metadata } from "next";

import { ThankYouClient } from "./thank-you-client";

export const metadata: Metadata = {
  title: "Thank You",
  description: "Thank you for joining Zapsters.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return <ThankYouClient />;
}
