import { Suspense } from "react";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import { fontHeading, fontBody } from "./fonts";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { ThemeManager } from "@/components/providers/theme-manager";
import { LiveRegionProvider } from "@/components/providers/live-region-provider";
import { DemoAnalyticsProvider } from "@/components/providers/demo-analytics-provider";
import { AnalyticsInit } from "@/components/providers/analytics-init";
import { DemoPreferencesProvider } from "@/components/providers/demo-preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/seo";
import { CookieBanner } from "@/components/shared/cookie-banner";
import { BackToTop } from "@/components/shared/back-to-top";
import { UtmTracker } from "@/hooks/use-utm";

export const metadata: Metadata = {
  title: {
    default: "Zapsters — Learn. Build. Climb.",
    template: "%s · Zapsters",
  },
  description:
    "Zapsters is a learning platform: Udemy-shaped courses, a HackerRank-shaped code judge, TryHackMe-shaped virtual labs, and a full gamification layer.",
  keywords: ["Zapsters", "cybersecurity courses", "coding judge", "virtual labs", "learning platform"],
  robots: { index: true, follow: true },
  metadataBase: getSiteUrl(),
  openGraph: {
    type: "website",
    siteName: "Zapsters",
    title: "Zapsters - Learn. Build. Climb.",
    description:
      "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zapsters - Learn. Build. Climb.",
    description:
      "Build practical skills through courses, coding challenges, virtual labs, and progression that keeps you moving.",
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
  themeColor: "#ffffff",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${fontHeading.variable} ${fontBody.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full">
        <ThemeManager />
        <LiveRegionProvider>
          <MotionProvider>
            <QueryProvider>
              <DemoPreferencesProvider>
                <DemoAnalyticsProvider>
                  <SessionProvider>{children}</SessionProvider>
                </DemoAnalyticsProvider>
              </DemoPreferencesProvider>
            </QueryProvider>
            <AnalyticsInit />
            <Toaster />
            <CookieBanner />
            <BackToTop />
            <Suspense fallback={null}>
              <UtmTracker />
            </Suspense>
          </MotionProvider>
        </LiveRegionProvider>
        <ServiceWorkerProvider />
      </body>
    </html>
  );
}
