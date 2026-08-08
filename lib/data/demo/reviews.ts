import type { ReviewPage } from "@/lib/contracts/content";
import { MOCK_REVIEWS } from "@/lib/mocks/reviews";
import { delay, jitter } from "./helpers";

export async function getCourseReviews(
  courseId: string,
  offset = 0,
  limit = 3,
): Promise<ReviewPage> {
  await delay(jitter(220));
  const reviews = MOCK_REVIEWS.filter((review) => review.course_id === courseId);
  const page = reviews.slice(offset, offset + limit);
  return {
    course_id: courseId,
    offset,
    total: reviews.length,
    reviews: page,
    has_more: offset + page.length < reviews.length,
  };
}
