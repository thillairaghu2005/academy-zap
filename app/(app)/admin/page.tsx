import type { Metadata } from "next";

import { AdminDashboardClient } from "@/components/admin/dashboard-client";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin & CMS — authoring, review and audit.",
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
