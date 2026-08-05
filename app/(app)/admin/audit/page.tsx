import type { Metadata } from "next";

import { AdminAuditClient } from "@/components/admin/audit-client";

export const metadata: Metadata = {
  title: "Admin · Audit log",
  description: "Append-only moderation trail.",
};

export default function AdminAuditPage() {
  return <AdminAuditClient />;
}
