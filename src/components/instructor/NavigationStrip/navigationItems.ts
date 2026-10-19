import {
  // Commented-out icons below belong to the disabled Home, Work, Batches,
  // Schedule & Communication and Insights entries (see PRIMARY_NAV_ITEMS).
  // BarChart3,
  BookOpen,
  // Briefcase,
  // CalendarDays,
  ClipboardList,
  Database,
  // FileCheck2,
  // FileEdit,
  HelpCircle,
  // Home,
  // Megaphone,
  // MessageSquareText,
  // NotebookPen,
  // Newspaper,
  // TrendingUp,
  // UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  // One further level of nesting — currently only "Work" (under "Teaching")
  // uses this, to keep its own grouping instead of flattening into its parent.
  children?: NavSubItem[];
}

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  primaryOnMobile?: boolean;
  children?: NavSubItem[];
}

/**
 * The top navigation strip. Every enabled destination is a flat link of its
 * own — no section dropdowns — so reaching any of them is one click rather
 * than hover-then-click. The `children` support in NavItem/NavSubItem is kept
 * because the disabled blocks below still use it, and because re-grouping is
 * a matter of nesting entries again rather than changing the renderer.
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  // Home — hidden from the nav for now. To bring it back, uncomment this
  // entry and the `Home` icon import above. The /instructor/dashboard route
  // itself is untouched and still reachable (the logo links to it).
  // { label: "Home", href: "/instructor/dashboard", icon: Home, primaryOnMobile: true },
  // Teaching's four entries, flattened up to the top level: each is its own
  // field in the bar rather than a dropdown. The strip renders these as plain
  // links (no chevron, no menu), and in bare mode the row scrolls sideways
  // rather than wrapping, so the extra width costs no layout.
  { label: "My Courses", href: "/instructor/courses", icon: BookOpen, primaryOnMobile: true },
  // Grading assignment submissions and reviewing Final test (MCQ) results.
  // The route keeps its original /assignments path so existing links work.
  { label: "Grading & Results", href: "/instructor/assignments", icon: ClipboardList, primaryOnMobile: true },
  // Points at /instructor/questions, not the /instructor/work/questions copy
  // listed in the disabled Work block below. Both render the same
  // QuestionRepositoryView, but this is the route that owns the
  // edit/[questionId] and view/[questionId] pages under it.
  { label: "Question Repository", href: "/instructor/questions", icon: Database, primaryOnMobile: true },
  { label: "Q&A", href: "/instructor/qa", icon: HelpCircle, primaryOnMobile: true },
  // Work section — hidden from the nav for now. To bring it back, uncomment
  // this block and its icon imports at the top of the file. The routes under
  // /instructor/work are untouched and still reachable by URL. (It sat under
  // "Teaching" before that group was flattened, hence the top level here.)
  // {
  //   label: "Work",
  //   icon: Briefcase,
  //   primaryOnMobile: true,
  //   children: [
  //     { label: "Create Quiz", href: "/instructor/work/quiz", icon: ClipboardList },
  //     { label: "Create Assessment", href: "/instructor/work/assessment", icon: FileEdit },
  //     { label: "Create Test", href: "/instructor/work/test", icon: FileCheck2 },
  //     { label: "Question Repository", href: "/instructor/work/questions", icon: Database },
  //     { label: "Upload Documents", href: "/instructor/work/documents", icon: UploadCloud },
  //     { label: "Notes", href: "/instructor/work/notes", icon: NotebookPen },
  //   ],
  // },
  { label: "Students", href: "/instructor/students", icon: Users, primaryOnMobile: true },
  // Schedule & Communication and Insights sections — hidden from the nav for
  // now, same as Work above. To bring either back, uncomment its block and the
  // matching icon imports at the top of the file. Every route underneath is
  // untouched and still reachable by URL.
  // {
  //   label: "Schedule & Communication",
  //   icon: CalendarDays,
  //   primaryOnMobile: true,
  //   children: [
  //     { label: "Calendar", href: "/instructor/calendar", icon: CalendarDays },
  //     { label: "News", href: "/instructor/news", icon: Newspaper },
  //     { label: "Announcements", href: "/instructor/announcements", icon: Megaphone },
  //     { label: "Reviews", href: "/instructor/feedback", icon: MessageSquareText },
  //   ],
  // },
  // {
  //   label: "Insights",
  //   icon: BarChart3,
  //   primaryOnMobile: true,
  //   children: [
  //     { label: "Analytics", href: "/instructor/analytics", icon: BarChart3 },
  //     { label: "Results", href: "/instructor/results", icon: TrendingUp },
  //   ],
  // },
];
