import type { Metadata } from "next";

import { AdminReviewsClient } from "@/components/admin/reviews-client";

export const metadata: Metadata = {
  title: "Admin · Credential reviews",
  description: "Review queue for flagged credentials and revocation decisions.",
};

export default function AdminReviewsPage() {
  return <AdminReviewsClient />;
}
