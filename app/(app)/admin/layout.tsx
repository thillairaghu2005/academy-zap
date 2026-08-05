import { AdminLayout } from "@/components/admin/admin-layout";

/**
 * Admin route group layout — role gate + admin sidebar around every
 * /admin/* page (F7). Lives inside the global (app) shell.
 */
export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
