export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface ProfileEditorValues {
  display_name: string;
  bio: string;
  skill_tags: string[];
  learning_goals: string[];
  experience_level: ExperienceLevel;
  weekly_goal_hours: number;
}

export type ProfileChecklistKey =
  | "avatar"
  | "bio"
  | "interests"
  | "goals"
  | "first_course"
  | "first_judge"
  | "guild"
  | "email";

export interface ProfileChecklistItem {
  id: ProfileChecklistKey;
  label: string;
  description: string;
  completed: boolean;
  href: string | null;
}

export interface Profile {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  skill_tags: string[];
  learning_goals: string[];
  preferred_learning_path: string;
  experience_level: ExperienceLevel;
  weekly_goal_hours: number;
  checklist: ProfileChecklistItem[];
  saved_course_ids: string[];
  bookmarked_lab_ids: string[];
  certificate_ids: string[];
  achievement_ids: string[];
}
