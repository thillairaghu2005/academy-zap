import type { ExperienceLevel, ProfileEditorValues } from "@/lib/contracts/profile";

import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

interface ProfileState {
  byUserId: Record<string, Partial<ProfileEditorValues>>;
}

const DEFAULT_STATE: ProfileState = { byUserId: {} };

function readState(): ProfileState {
  const persisted = readDemoStorage<Partial<ProfileState> | null>(
    DEMO_STORAGE_KEYS.profile,
    null,
  );
  if (!persisted || typeof persisted !== "object") return DEFAULT_STATE;
  return {
    byUserId:
      persisted.byUserId && typeof persisted.byUserId === "object"
        ? persisted.byUserId
        : {},
  };
}

export function getProfileOverrides(userId: string): Partial<ProfileEditorValues> {
  return readState().byUserId[userId] ?? {};
}

export function saveProfileOverrides(
  userId: string,
  values: ProfileEditorValues,
): void {
  const state = readState();
  state.byUserId[userId] = {
    display_name: values.display_name,
    bio: values.bio,
    skill_tags: values.skill_tags,
    learning_goals: values.learning_goals,
    experience_level: values.experience_level,
    weekly_goal_hours: values.weekly_goal_hours,
  };
  writeDemoStorage(DEMO_STORAGE_KEYS.profile, state);
}

export function normalizeProfileEditorValues(
  values: ProfileEditorValues,
): ProfileEditorValues {
  return {
    ...values,
    display_name: values.display_name.trim(),
    bio: values.bio.trim(),
    skill_tags: uniqueTrimmed(values.skill_tags),
    learning_goals: uniqueTrimmed(values.learning_goals),
    experience_level: values.experience_level as ExperienceLevel,
    weekly_goal_hours: Math.max(1, Math.min(40, Math.round(values.weekly_goal_hours))),
  };
}

function uniqueTrimmed(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
