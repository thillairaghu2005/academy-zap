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
      { href: "/saved", label: "Saved", icon: Bookmark },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/judge", label: "Judge Engine", icon: CodeXml },
      { href: "/labs", label: "Virtual Labs", icon: FlaskConical },
    ],
  },
  {
    label: "Prove",
    items: [
      { href: "/assessments", label: "Assessments", icon: ClipboardList },
      { href: "/rank", label: "Rank Ladder", icon: Trophy },
      { href: "/leaderboards", label: "Leaderboards", icon: ChartColumn },
      { href: "/guilds", label: "Guilds", icon: Users },
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
