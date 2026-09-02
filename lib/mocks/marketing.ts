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
    quote: "The automated grading and isolated environments let me focus entirely on exploiting vulnerabilities, rather than troubleshooting my setup.",
    initials: "MC",
    rating: 5,
    featured: true,
  },
  {
    name: "Arjun Mehta",
    role: "Frontend lead, Meridian",
    quote: "Receiving instant, deterministic feedback from the Judge engine accelerated my learning curve immensely.",
    initials: "AM",
    rating: 5,
  },
  {
    name: "Elena Rossi",
    role: "Cloud analyst, Orbital",
    quote: "The progression system is tied to real, verifiable engineering achievements, not just watching videos.",
    initials: "ER",
    rating: 5,
  },
];

export const MARKETING_FAQ: MarketingFaq[] = [
  {
    question: "Is Zapsters free to try?",
    answer: "Yes. The Starter plan provides full access to foundational courses, public lab environments, and basic progression tracking without requiring a credit card.",
  },
  {
    question: "Are the labs real environments?",
    answer: "Yes. Zapsters provisions real, isolated lab environments for every session to ensure safe, hands-on learning without risking your local machine.",
  },
  {
    question: "Can I learn on mobile?",
    answer: "Yes. The app shell, course player, labs, checkout, flashcard-style review, and navigation are designed for touch-sized controls and narrow screens.",
  },
  {
    question: "How does progression work?",
    answer: "Every completed lesson, Judge submission, and lab objective feeds into a verified ledger, building your rank and momentum streak based on tangible engineering effort.",
  },
];
