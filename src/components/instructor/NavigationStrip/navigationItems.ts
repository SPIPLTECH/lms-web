import {
  BookOpen,
  ClipboardList,
  Database,
  HelpCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: NavSubItem[];
}

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  primaryOnMobile?: boolean;
  // Student onboarding tour target (data-tour) — see StudentTour.
  tourId?: string;
  children?: NavSubItem[];
}

/**
 * The top navigation strip. Every destination is a flat link of its own — no
 * section dropdowns — so reaching any of them is one click. The renderer also
 * supports nested `children`, should entries ever be grouped again.
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "My Courses", href: "/instructor/courses", icon: BookOpen, primaryOnMobile: true },
  // Grading assignment submissions and reviewing Final test (MCQ) results.
  // The route keeps its original /assignments path so existing links work.
  { label: "Grading & Results", href: "/instructor/assignments", icon: ClipboardList, primaryOnMobile: true },
  { label: "Question Repository", href: "/instructor/questions", icon: Database, primaryOnMobile: true },
  { label: "Q&A", href: "/instructor/qa", icon: HelpCircle, primaryOnMobile: true },
  { label: "Students", href: "/instructor/students", icon: Users, primaryOnMobile: true },
];
