import type { Metadata } from "next";

import { AdminProblemsClient } from "@/components/admin/problems-client";

export const metadata: Metadata = {
  title: "Admin · Problems",
  description: "Judge catalog read view.",
};

export default function AdminProblemsPage() {
  return <AdminProblemsClient />;
}
