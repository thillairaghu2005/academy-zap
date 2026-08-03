import type { Metadata, Viewport } from "next";

import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Zapsters — Learn. Build. Climb.",
    template: "%s · Zapsters",
  },
  description:
    "Zapsters is a learning platform: Udemy-shaped courses, a HackerRank-shaped code judge, TryHackMe-shaped virtual labs, and a full gamification layer.",
};

export const viewport: Viewport = {
  themeColor: "#0a0d13",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <QueryProvider>
          <SessionProvider>{children}</SessionProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
