import type { Profile } from "@/lib/contracts/profile";
import { MOCK_PROFILE } from "@/lib/mocks/profile";
import { listBookmarkedCourseIds } from "@/lib/demo/course-notes";
import { listBookmarkedLabIds } from "@/lib/demo/lab-bookmarks";
import { getProfileOverrides } from "@/lib/demo/profile";
import { MockDataError } from "./errors";
import { delay, jitter } from "./helpers";

export async function getProfile(userId: string): Promise<Profile> {
  await delay(jitter(180));
  if (!userId) throw new MockDataError("demo_session_required", "Sign in to view your profile.", 401);
  const profile = { ...MOCK_PROFILE, ...getProfileOverrides(userId), user_id: userId };
  const checklist = profile.checklist.map((item) => {
    if (item.id === "bio") return { ...item, completed: Boolean(profile.bio.trim()) };
    if (item.id === "interests") return { ...item, completed: profile.skill_tags.length > 0 };
    if (item.id === "goals") return { ...item, completed: profile.learning_goals.length > 0 };
    return item;
  });
  return {
    ...profile,
    checklist,
    saved_course_ids: listBookmarkedCourseIds(),
    bookmarked_lab_ids: listBookmarkedLabIds(),
  };
}
