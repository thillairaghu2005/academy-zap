import type { Thread, Reply } from "@/lib/contracts/discussions";
import { delay, jitter } from "./helpers";

const MOCK_THREADS: Thread[] = [
  {
    id: "thread-1",
    lesson_id: "lesson-1",
    author: {
      id: "u-1",
      name: "Alex Coder",
      role: "user",
      avatar_url: "https://i.pravatar.cc/150?u=1",
    },
    title: "Why use pointers here instead of references?",
    content: "I noticed in the video you used a double pointer to modify the head of the list. Is there a specific reason to do this rather than returning the new head and reassigning?",
    upvotes: 12,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ["c++", "pointers", "best-practices"],
    is_resolved: true,
    replies: [
      {
        id: "reply-1",
        thread_id: "thread-1",
        author: {
          id: "inst-1",
          name: "Sarah Mentor",
          role: "instructor",
          avatar_url: "https://i.pravatar.cc/150?u=2",
        },
        content: "Great question! Both approaches work. Using a double pointer allows the function to mutate the caller's variable directly without relying on the caller to remember to reassign the return value. It's common in C-style APIs, but in modern C++ or Java, returning the new head is often preferred for readability.",
        upvotes: 24,
        created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        is_accepted_answer: true,
      }
    ]
  },
  {
    id: "thread-2",
    lesson_id: "lesson-1",
    author: {
      id: "u-2",
      name: "Jamie Learner",
      role: "user",
      avatar_url: "https://i.pravatar.cc/150?u=3",
    },
    title: "Time complexity question",
    content: "Is the time complexity of this approach O(N) or O(N log N)? I'm a bit confused about the inner loop.",
    upvotes: 3,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    tags: ["complexity", "big-o"],
    is_resolved: false,
    replies: [
      {
        id: "reply-2",
        thread_id: "thread-2",
        author: {
          id: "u-4",
          name: "Sam Developer",
          role: "user",
          avatar_url: "https://i.pravatar.cc/150?u=4",
        },
        content: "It's O(N). Even though there's an inner loop, notice that it only advances the pointer forward, and across all iterations of the outer loop, the inner loop body executes at most N times total.",
        upvotes: 5,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        is_accepted_answer: false,
      }
    ]
  }
];

export async function getThreadsForLesson(lessonId: string): Promise<Thread[]> {
  await delay(jitter(400));
  return MOCK_THREADS.filter(t => t.lesson_id === lessonId);
}

export async function createThread(lessonId: string, title: string, content: string, tags: string[]): Promise<Thread> {
  await delay(jitter(600));
  const newThread: Thread = {
    id: `thread-${Date.now()}`,
    lesson_id: lessonId,
    author: { id: "me", name: "Current User", role: "user" },
    title,
    content,
    upvotes: 0,
    created_at: new Date().toISOString(),
    tags,
    is_resolved: false,
    replies: []
  };
  MOCK_THREADS.unshift(newThread);
  return newThread;
}

export async function replyToThread(threadId: string, content: string): Promise<Reply> {
  await delay(jitter(500));
  const thread = MOCK_THREADS.find(t => t.id === threadId);
  if (!thread) throw new Error("Thread not found");
  
  const newReply: Reply = {
    id: `reply-${Date.now()}`,
    thread_id: threadId,
    author: { id: "me", name: "Current User", role: "user" },
    content,
    upvotes: 0,
    created_at: new Date().toISOString(),
    is_accepted_answer: false
  };
  thread.replies.push(newReply);
  return newReply;
}

export async function toggleUpvoteThread(threadId: string): Promise<void> {
  await delay(jitter(200));
  const thread = MOCK_THREADS.find(t => t.id === threadId);
  if (thread) {
    // Mocking toggle: either +1 or -1 for simplicity
    thread.upvotes += 1; 
  }
}

export async function toggleUpvoteReply(threadId: string, replyId: string): Promise<void> {
  await delay(jitter(200));
  const thread = MOCK_THREADS.find(t => t.id === threadId);
  if (thread) {
    const reply = thread.replies.find(r => r.id === replyId);
    if (reply) reply.upvotes += 1;
  }
}
