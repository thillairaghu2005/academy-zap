import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  CodeXml,
  FlaskConical,
  LayoutDashboard,
  ShoppingCart,
  Trophy,
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

/** Top nav — the four primary learning surfaces */
export const primaryNav: NavItem[] = [
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/judge", label: "Judge", icon: CodeXml },
  { href: "/labs", label: "Labs", icon: FlaskConical },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
];

/** Side nav — full taxonomy, grouped by intent */
export const sideNavGroups: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/courses", label: "Courses", icon: BookOpen },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/judge", label: "Judge Engine", icon: CodeXml },
      { href: "/labs", label: "Virtual Labs", icon: FlaskConical },
      { href: "/assessments", label: "Assessments", icon: ClipboardList },
    ],
  },
  {
    label: "Climb",
    items: [
      { href: "/rank", label: "Rank Ladder", icon: Trophy },
      { href: "/leaderboards", label: "Leaderboards", icon: ChartColumn },
      { href: "/guilds", label: "Guilds", icon: Users },
    ],
  },
  {
    label: "Commerce",
    items: [{ href: "/checkout", label: "Checkout", icon: ShoppingCart }],
  },
];
