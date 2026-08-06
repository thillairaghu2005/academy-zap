import type { Profile } from "@/lib/contracts/profile";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";
import { MOCK_PROFILE } from "@/lib/mocks/profile";

/** Profile read model. Replace this body with the Platform Core profile API. */
export async function getProfile(userId: string): Promise<Profile> {
  await delay(jitter(180));
  if (!userId) {
    throw new MockApiError("auth_required", "Sign in to view your profile.", 401);
  }
  return { ...MOCK_PROFILE, user_id: userId };
}
