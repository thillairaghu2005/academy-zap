export interface InstructorSocialLinks {
  linkedin: string;
  website: string;
}

export interface InstructorProfile {
  id: string;
  name: string;
  role: string;
  years_experience: number;
  company: string;
  bio: string;
  skill_tags: string[];
  social_links: InstructorSocialLinks;
  courses_taught: number;
  students_taught: number;
  average_rating: number;
  languages: string[];
  response_time: string;
  office_hours: string;
  verified: boolean;
}
