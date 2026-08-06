import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zapsters.dev";
const IMAGE = "/icons/android-chrome-512x512.png";

export function buildMetadata({ title, description, path, keywords = [] }: { title: string; description: string; path: string; keywords?: string[] }): Metadata {
  return {
    title,
    description,
    keywords: ["Zapsters", "learn build climb", ...keywords],
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title, description, siteName: "Zapsters", images: [{ url: IMAGE, width: 512, height: 512, alt: "Zapsters" }] },
    twitter: { card: "summary_large_image", title, description, images: [IMAGE] },
    metadataBase: new URL(SITE_URL),
  };
}
