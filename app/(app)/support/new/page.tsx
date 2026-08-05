import type { Metadata } from "next";

import { CreateTicketForm } from "@/components/support/create-ticket-form";

export const metadata: Metadata = {
  title: "Support · Open a ticket",
  description: "Open a new support ticket.",
};

export default function NewTicketPage() {
  return <CreateTicketForm />;
}
