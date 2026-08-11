export interface MarketingPlan {
  name: string;
  monthly: number;
  yearly: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export interface MarketingTestimonial {
  name: string;
  role: string;
  quote: string;
  initials: string;
  rating: number;
  featured?: boolean;
}

export interface MarketingFaq {
  question: string;
  answer: string;
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    description: "A focused way to begin building your practice.",
    features: ["Free foundational courses", "Public Judge problems", "Progress tracking"],
    cta: "Start free",
  },
  {
    name: "Pro",
    monthly: 24,
    yearly: 19,
    description: "The complete loop for serious, consistent learners.",
    features: ["All courses and labs", "Advanced assessments", "Certificates and mentor credits", "AI Tutor guidance"],
    highlighted: true,
    cta: "Choose Pro",
  },
  {
    name: "Teams",
    monthly: 39,
    yearly: 31,
    description: "Shared practice and visibility for growing teams.",
    features: ["Everything in Pro", "Team seats and reporting", "Guild study groups", "Priority support"],
    cta: "Talk to us",
  },
];

export const MARKETING_TESTIMONIALS: MarketingTestimonial[] = [
  {
    name: "Maya Chen",
    role: "Security engineer, Northstar",
    quote: "Zapsters replaced three disconnected tabs with one habit I could actually keep.",
    initials: "MC",
    rating: 5,
    featured: true,
  },
  {
    name: "Arjun Mehta",
    role: "Frontend lead, Meridian",
    quote: "The Judge feedback turns a lesson into a real skill much faster than passive video ever did.",
    initials: "AM",
    rating: 5,
  },
  {
    name: "Elena Rossi",
    role: "Cloud analyst, Orbital",
    quote: "I can see exactly what to do next, and the progress feels earned instead of gamified for its own sake.",
    initials: "ER",
    rating: 5,
  },
];

export const MARKETING_FAQ: MarketingFaq[] = [
  {
    question: "Is Zapsters free to try?",
    answer: "Yes. Starter includes free foundational courses, public Judge problems, and progress tracking. No card is required.",
  },
  {
    question: "Is this a real backend or a demo?",
    answer: "This workspace is a frontend-first demo. Authentication, progression, commerce, notifications, and offline behavior use deterministic local mock services so every flow is safe to explore.",
  },
  {
    question: "Can I learn on mobile?",
    answer: "Yes. The app shell, course player, labs, checkout, flashcard-style review, and navigation are designed for touch-sized controls and narrow screens.",
  },
  {
    question: "How does progression work?",
    answer: "Lessons, Judge submissions, labs, and assessments feed the existing demo gamification engine. Your rank and streak are derived from the shared progress context rather than isolated page state.",
  },
];
