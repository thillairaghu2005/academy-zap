import type { MetadataRoute } from "next";

import { MOCK_PROBLEMS } from "@/lib/mocks/judge";
import { MOCK_LABS } from "@/lib/mocks/labs";
import { MOCK_MENTORS } from "@/lib/mocks/mentors";
import { MOCK_COURSES } from "@/lib/mocks/courses";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/courses`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/judge`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/labs`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/mentors`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];

  const courseRoutes = MOCK_COURSES.reduce<MetadataRoute.Sitemap>((routes, course) => {
    if (course.status === "published") routes.push({ url: `${SITE_URL}/courses/${course.id}`, lastModified: course.updated_at, changeFrequency: "weekly", priority: 0.8 });
    return routes;
  }, []);
  const judgeRoutes = MOCK_PROBLEMS.map((problem) => ({
    url: `${SITE_URL}/judge/${problem.id}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  const labRoutes = MOCK_LABS.map((lab) => ({
    url: `${SITE_URL}/labs/${lab.id}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
  const mentorRoutes = MOCK_MENTORS.map((mentor) => ({
    url: `${SITE_URL}/mentors/${mentor.id}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...courseRoutes, ...judgeRoutes, ...labRoutes, ...mentorRoutes];
}
