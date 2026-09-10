export interface Author {
  id: string;
  name: string;
  avatar_url?: string;
  role: "user" | "instructor" | "mentor" | "org_admin" | "platform_ops";
}

export interface Reply {
  id: string;
  thread_id: string;
  author: Author;
  content: string;
  upvotes: number;
  created_at: string;
  is_accepted_answer: boolean;
}

export interface Thread {
  id: string;
  lesson_id: string;
  author: Author;
  title: string;
  content: string;
  upvotes: number;
  created_at: string;
  tags: string[];
  replies: Reply[];
  is_resolved: boolean;
}
