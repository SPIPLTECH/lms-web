import {
  BookOpen,
  ClipboardCheck,
  Award,
} from "lucide-react";
import type { NavItem } from "@/components/instructor/NavigationStrip/navigationItems";

/**
 * The Student quick-action strip's items — same shape as the Instructor's
 * PRIMARY_NAV_ITEMS (@/components/instructor/NavigationStrip/navigationItems),
 * rendered through the shared QuickActionStrip component.
 * `primaryOnMobile` items are the phone bottom-bar tabs (StudentBottomTabs);
 * `matches` lists the other routes that keep that tab lit; `tourId` is what
 * the onboarding tour spotlights (both the strip pill and the bottom tab).
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    label: "Learning",
    href: "/student/my-courses",
    icon: BookOpen,
    primaryOnMobile: true,
    matches: ["/student/courses"],
  },
  {
    label: "Submissions",
    href: "/student/assignments",
    icon: ClipboardCheck,
    primaryOnMobile: true,
    matches: ["/student/result", "/student/quizzes"],
    tourId: "submissions",
  },
  {
    label: "Certificates",
    href: "/student/certificates",
    icon: Award,
    primaryOnMobile: false,
    matches: ["/student/certificates"],
    tourId: "certificates",
  },
];
