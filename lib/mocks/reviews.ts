import type { Review } from "@/lib/contracts/content";

/** Mock Content Engine review projection; the component never owns this shape. */
export const MOCK_REVIEWS: Review[] = [
  {
    id: "review-python-1",
    course_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    author: { id: "reviewer-001", name: "Maya Chen", avatar_url: null },
    rating: 5,
    date: "2026-07-28T09:00:00Z",
    comment:
      "The log parser project made the regex lessons click. I used the same approach on a real triage queue the next day.",
    helpful_count: 42,
  },
  {
    id: "review-python-2",
    course_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    author: { id: "reviewer-002", name: "Jon Bell", avatar_url: null },
    rating: 5,
    date: "2026-07-19T09:00:00Z",
    comment:
      "Clear explanations, realistic data, and no filler. The capstone is exactly the right size for a first security automation project.",
    helpful_count: 31,
  },
  {
    id: "review-python-3",
    course_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    author: { id: "reviewer-003", name: "Sofia Alvarez", avatar_url: null },
    rating: 4,
    date: "2026-07-05T09:00:00Z",
    comment:
      "A friendly route into Python for analysts. I would have liked a few more exercises between the video and the final project.",
    helpful_count: 18,
  },
  {
    id: "review-python-4",
    course_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    author: { id: "reviewer-004", name: "Nikhil Rao", avatar_url: null },
    rating: 5,
    date: "2026-06-22T09:00:00Z",
    comment:
      "The packet parsing walkthrough is the best part. Practical, concise, and easy to revisit when you need a pattern quickly.",
    helpful_count: 27,
  },
  {
    id: "review-web-1",
    course_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    author: { id: "reviewer-005", name: "Aisha Khan", avatar_url: null },
    rating: 5,
    date: "2026-07-25T09:00:00Z",
    comment: "The vulnerable app labs turn every OWASP concept into something memorable.",
    helpful_count: 23,
  },
  {
    id: "review-react-1",
    course_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    author: { id: "reviewer-006", name: "Leo Martin", avatar_url: null },
    rating: 5,
    date: "2026-07-12T09:00:00Z",
    comment: "Finally a course that treats contracts and data layers as first-class design decisions.",
    helpful_count: 16,
  },
];
