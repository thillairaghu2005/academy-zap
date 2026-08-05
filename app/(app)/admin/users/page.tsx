import type { Metadata } from "next";

import { AdminUsersClient } from "@/components/admin/users-client";

export const metadata: Metadata = {
  title: "Admin · Users",
  description: "User directory and role management.",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
