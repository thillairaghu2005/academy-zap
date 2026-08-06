import type { TrustSnapshot } from "@/lib/contracts/trust";
import { delay, jitter } from "@/lib/api/helpers";
import { MOCK_TRUST_SNAPSHOT } from "@/lib/mocks/trust";

/** Trust read model seam for the future Content and Analytics services. */
export async function getCourseTrust(_courseId: string): Promise<TrustSnapshot> {
  void _courseId;
  await delay(jitter(120));
  return MOCK_TRUST_SNAPSHOT;
}
