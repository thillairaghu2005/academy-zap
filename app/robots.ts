import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/courses", "/judge", "/labs", "/mentors", "/rank/verify/"],
      disallow: [
        "/admin/",
        "/cart",
        "/checkout/",
        "/dashboard",
        "/profile",
        "/support",
        "/assessments/",
        "/rank",
        "/leaderboards",
        "/guilds",
        "/courses/*/learn",
        "/labs/*/session/",
        "/offline",
      ],
    },
    sitemap: `${getSiteUrl().origin}/sitemap.xml`,
  };
}
