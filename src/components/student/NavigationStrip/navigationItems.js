import {
  BookOpen,
  ClipboardCheck,
  CodeXml,
} from "lucide-react";

/**
 * The Student quick-action strip's items — same shape as the Instructor's
 * PRIMARY_NAV_ITEMS (@/components/instructor/NavigationStrip/navigationItems),
 * rendered through the shared QuickActionStrip component.
 * `primaryOnMobile` items are the phone bottom-bar tabs (StudentBottomTabs);
 * `matches` lists the other routes that keep that tab lit; `tourId` is what
 * the onboarding tour spotlights (both the strip pill and the bottom tab).
 */
export const PRIMARY_NAV_ITEMS = [
  { label: "Learning", href: "/student/my-courses", icon: BookOpen, primaryOnMobile: true, matches: ["/student/courses"] },
  // Every assignment and quiz the student has submitted — grades, scores,
  // attempts and instructor feedback — the lasting record, unlike a
  // dismissible notification. The route keeps its /assignments path so
  // existing links still land here.
  {
    label: "Submissions",
    href: "/student/assignments",
    icon: ClipboardCheck,
    primaryOnMobile: true,
    matches: ["/student/result", "/student/quizzes"],
    tourId: "submissions",
  },
  // Code-IT: coding lab + playground (Java, Python, C, C++, JS), served by
  // the separate code-it-service microservice.
  { label: "Code-IT", href: "/student/code-it", icon: CodeXml, primaryOnMobile: true },
];
