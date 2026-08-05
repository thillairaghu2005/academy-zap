import type { Metadata } from "next";

import { AdminLabsClient } from "@/components/admin/labs-client";

export const metadata: Metadata = {
  title: "Admin · Labs",
  description: "Lab catalog read view.",
};

export default function AdminLabsPage() {
  return <AdminLabsClient />;
}
