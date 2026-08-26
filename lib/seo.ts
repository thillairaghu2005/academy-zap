import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zapsters.dev";
const FALLBACK_SITE_URL = "https://zapsters.dev";

/** Validated absolute origin for canonical URLs, sitemap, and robots output. */
export function getSiteUrl(): URL {
  try {
    const url = new URL(SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported site URL protocol");
    return new URL(url.origin);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

/**
 * Shared per-page metadata. Open Graph / Twitter images come from the
 * app-level `opengraph-image` / `twitter-image` file conventions so every
 * route shares one branded 1200x630 asset.
 */
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
    openGraph: { type: "website", url: path, title, description, siteName: "Zapsters" },
    twitter: { card: "summary_large_image", title, description },
    metadataBase: getSiteUrl(),
  };
}
