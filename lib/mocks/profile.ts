import type { Profile } from "@/lib/contracts/profile";
import { MOCK_DEMO_USER_ID } from "@/lib/mocks/gamification";

export const MOCK_PROFILE: Profile = {
  user_id: MOCK_DEMO_USER_ID,
  display_name: "Aarav Mehta",
  email: "aarav@zapsters.dev",
  avatar_url: null,
  bio: "Detection engineer building practical security automation and reliable data layers.",
  skill_tags: ["Python", "Threat detection", "Linux", "TypeScript"],
  learning_goals: ["Build security tools", "Move into detection engineering"],
  preferred_learning_path: "Security engineering",
  experience_level: "intermediate",
  weekly_goal_hours: 6,
  checklist: [
    { id: "avatar", label: "Upload avatar", description: "Add a recognizable profile image.", completed: false, href: null },
    { id: "bio", label: "Add bio", description: "Tell the community what you are building.", completed: true, href: null },
    { id: "interests", label: "Select interests", description: "Choose the skills you want to practice.", completed: true, href: null },
    { id: "goals", label: "Choose learning goals", description: "Set the outcome you are working toward.", completed: true, href: null },
    { id: "first_course", label: "Complete first course", description: "Finish a course from the catalog.", completed: true, href: "/courses" },
    { id: "first_judge", label: "Solve first Judge problem", description: "Submit a solution and earn your first verdict.", completed: true, href: "/judge" },
    { id: "guild", label: "Join a guild", description: "Find peers to climb with.", completed: true, href: "/guilds" },
    { id: "email", label: "Verify email", description: "Secure your account and unlock notifications.", completed: true, href: null },
  ],
  saved_course_ids: [],
  bookmarked_lab_ids: [],
  certificate_ids: [],
  achievement_ids: [],
};
