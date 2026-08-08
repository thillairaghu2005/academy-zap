import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

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
        "/support/",
        "/assessments/",
        "/rank",
        "/leaderboards",
        "/guilds",
        "/courses/*/learn",
        "/labs/*/session/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
