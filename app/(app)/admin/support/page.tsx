import type { Metadata } from "next";

import { AdminSupportQueueClient } from "@/components/admin/support-queue-client";

export const metadata: Metadata = {
  title: "Admin · Support queue",
  description: "Support ticket queue.",
};

export default function AdminSupportQueuePage() {
  return <AdminSupportQueueClient />;
}
