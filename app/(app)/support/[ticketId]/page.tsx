import type { Metadata } from "next";

import { TicketThreadClient } from "@/components/support/ticket-thread-client";

export const metadata: Metadata = {
  title: "Support · Ticket",
  description: "Ticket thread.",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <TicketThreadClient ticketId={ticketId} />;
}
