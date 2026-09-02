import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  CodeXml,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Bookmark,
  ShoppingCart,
  Trophy,
  UserRound,
  Users,
  GitBranch,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Side nav — full taxonomy, grouped by intent */
export const sideNavGroups: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/learning-paths", label: "Learning Paths", icon: GitBranch },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/judge", label: "Judge Engine", icon: CodeXml },
      { href: "/labs", label: "Virtual Labs", icon: FlaskConical },
      { href: "/challenges", label: "Challenges", icon: Trophy },
    ],
  },
  {
    label: "Career",
    items: [
      { href: "/assessments", label: "Assessments", icon: ClipboardList },
      { href: "/interviews", label: "Mock Interviews", icon: Users },
      { href: "/leaderboards", label: "Leaderboards", icon: ChartColumn },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/saved", label: "Saved", icon: Bookmark },
      { href: "/mentors", label: "Mentors", icon: UserRound },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/profile", label: "Profile & preferences", icon: UserRound }],
  },
  {
    label: "Commerce",
    items: [
      { href: "/cart", label: "Cart", icon: ShoppingCart },
      { href: "/checkout/billing", label: "Billing & seats", icon: CreditCard },
    ],
  },
];
