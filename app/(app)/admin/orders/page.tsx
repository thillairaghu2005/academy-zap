import type { Metadata } from "next";

import { AdminOrdersClient } from "@/components/admin/orders-client";

export const metadata: Metadata = {
  title: "Admin · Orders",
  description: "Payments read view.",
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
