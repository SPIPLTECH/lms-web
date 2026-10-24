import {
  BookOpen,
  ClipboardCheck,
} from "lucide-react";

/**
 * The Student quick-action strip's items — same shape as the Instructor's
 * PRIMARY_NAV_ITEMS (@/components/instructor/NavigationStrip/navigationItems),
 * rendered through the shared QuickActionStrip component.
 */
export const PRIMARY_NAV_ITEMS = [
  { label: "Learning", href: "/student/my-courses", icon: BookOpen, primaryOnMobile: true },
  // Every assignment and quiz the student has submitted — grades, scores,
  // attempts and instructor feedback — the lasting record, unlike a
  // dismissible notification. The route keeps its /assignments path so
  // existing links still land here.
  { label: "Submissions", href: "/student/assignments", icon: ClipboardCheck, primaryOnMobile: true },
];
