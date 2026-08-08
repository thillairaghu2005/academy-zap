import type { Profile } from "@/lib/contracts/profile";
import { MOCK_PROFILE } from "@/lib/mocks/profile";
import { MockDataError } from "./errors";
import { delay, jitter } from "./helpers";

export async function getProfile(userId: string): Promise<Profile> {
  await delay(jitter(180));
  if (!userId) throw new MockDataError("demo_session_required", "Sign in to view your profile.", 401);
  return { ...MOCK_PROFILE, user_id: userId };
}
