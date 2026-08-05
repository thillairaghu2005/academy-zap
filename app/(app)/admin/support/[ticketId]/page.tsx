import type { Metadata } from "next";

import { AdminSupportTicketDetail } from "@/components/admin/support-ticket-detail";

export const metadata: Metadata = {
  title: "Admin · Ticket",
  description: "Support ticket detail.",
};

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <AdminSupportTicketDetail ticketId={ticketId} />;
}
