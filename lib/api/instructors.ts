import type { InstructorProfile } from "@/lib/contracts/instructor";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";
import { MOCK_MENTORS } from "@/lib/mocks/mentors";

/** Instructor read model; the Content Engine can replace this mock endpoint. */
export async function getInstructor(instructorId: string): Promise<InstructorProfile> {
  await delay(jitter(160));
  const instructor = MOCK_MENTORS.find((candidate) => candidate.id === instructorId);
  if (!instructor) throw new MockApiError("instructor_not_found", "Instructor not found.", 404);
  return instructor;
}

export async function listInstructors(): Promise<InstructorProfile[]> {
  await delay(jitter(160));
  return MOCK_MENTORS;
}
