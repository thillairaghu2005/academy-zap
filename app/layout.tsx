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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    siteName: "Zapsters",
    title: "Zapsters - Learn. Build. Climb.",
    description:
      "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
    images: [
      {
        url: "/icons/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Zapsters Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zapsters - Learn. Build. Climb.",
    description:
      "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
    images: ["/icons/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f8f9fb",
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
