import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zapsters.dev";
const IMAGE = "/icons/android-chrome-512x512.png";
const FALLBACK_SITE_URL = "https://zapsters.dev";

export function getSiteUrl(): URL {
  try {
    const url = new URL(SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported site URL protocol");
    return url;
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  index = false,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  index?: boolean;
}): Metadata {
  return {
    title,
    description,
    keywords: ["Zapsters", "learn build climb", ...keywords],
    alternates: { canonical: path },
    robots: { index, follow: index },
    openGraph: { type: "website", url: path, title, description, siteName: "Zapsters", images: [{ url: IMAGE, width: 512, height: 512, alt: "Zapsters" }] },
    twitter: { card: "summary_large_image", title, description, images: [IMAGE] },
    metadataBase: getSiteUrl(),
  };
}
