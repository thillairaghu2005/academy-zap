import type { TrustSnapshot } from "@/lib/contracts/trust";
import { MOCK_TRUST_SNAPSHOT } from "@/lib/mocks/trust";
import { delay, jitter } from "./helpers";

export async function getCourseTrust(_courseId: string): Promise<TrustSnapshot> {
  await delay(jitter(120));
  return MOCK_TRUST_SNAPSHOT;
}
