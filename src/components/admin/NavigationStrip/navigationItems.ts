import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  primaryOnMobile?: boolean;
  children?: NavSubItem[];
}

/**
 * The single top navigation strip — every admin destination lives here,
 * mirroring the instructor NavigationStrip's layout and behavior.
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/admin/dashboard", icon: Home, primaryOnMobile: true },
  { label: "Students", href: "/admin/students", icon: GraduationCap, primaryOnMobile: true },
  { label: "Instructors", href: "/admin/instructors", icon: Users, primaryOnMobile: true },
  { label: "Courses", href: "/admin/courses", icon: BookOpen, primaryOnMobile: true },
  { label: "Enrollments", href: "/admin/enrollments", icon: GraduationCap, primaryOnMobile: true },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, primaryOnMobile: true },
  { label: "Profile", href: "/admin/profile", icon: UserCircle, primaryOnMobile: true },
];
