import type { InstructorProfile } from "@/lib/contracts/instructor";
import { MOCK_MENTORS } from "@/lib/mocks/mentors";
import { MockDataError } from "./errors";
import { delay, jitter } from "./helpers";

export async function getInstructor(instructorId: string): Promise<InstructorProfile> {
  await delay(jitter(160));
  const instructor = MOCK_MENTORS.find((candidate) => candidate.id === instructorId);
  if (!instructor) throw new MockDataError("instructor_not_found", "Instructor not found.", 404);
  return instructor;
}

export async function listInstructors(): Promise<InstructorProfile[]> {
  await delay(jitter(160));
  return MOCK_MENTORS;
}
