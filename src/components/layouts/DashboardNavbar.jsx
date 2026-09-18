"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FaBars } from "@/components/ui/reactIcons";
import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import useAuth from "@/hooks/useAuth";
import useChat from "@/hooks/useChat";
import { useNotification } from "@/context/NotificationContext";
import { useStudentNavDrawer } from "@/context/StudentNavDrawerContext";
import { useInstructorNavDrawer } from "@/context/InstructorNavDrawerContext";
import { useAdminNavDrawer } from "@/context/AdminNavDrawerContext";
import Modal from "@/components/ui/Modal";
import { ThemeSwitcher } from "@/components/ui/shadcn/theme-switcher";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import { useModule } from "@/hooks/queries/instructor/useModule";
import { useLesson } from "@/hooks/queries/instructor/useLesson";
import { useContent } from "@/hooks/queries/instructor/useContent";
import { useQuiz } from "@/hooks/queries/instructor/useQuiz";
import { useQuestion } from "@/hooks/queries/instructor/useQuestion";

import GlobalSearch from "@/components/layouts/GlobalSearch";
import { NotificationsMenu, ProfileMenu } from "@/components/layouts/NavUserMenus";
import { NavigationStrip } from "@/components/instructor/NavigationStrip/NavigationStrip";
import { NavigationStrip as StudentNavigationStrip } from "@/components/student/NavigationStrip/NavigationStrip";
import { NavigationStrip as AdminNavigationStrip } from "@/components/admin/NavigationStrip/NavigationStrip";

function ProfileDropdown({ user, onLogoutRequest, role }) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN";
  const profileHref = isAdmin ? "/admin/profile" : "/instructor/profile";
  const settingsHref = isAdmin ? "/admin/profile" : "/instructor/settings";

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
          open
            ? "bg-muted border-transparent text-foreground"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border"
        }`}
      >
        <span className="h-4 w-4 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-[9px] font-black font-mono shrink-0">
          {user?.name?.[0]?.toUpperCase() || (isAdmin ? 'A' : 'I')}
        </span>
        <span className="hidden md:inline truncate max-w-[80px]">{user?.name || "Profile"}</span>
        <span className="hidden md:inline text-[9px] text-slate-500 shrink-0">▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-[10px] font-black text-foreground truncate">{user?.name}</p>
              <p className="text-[8.5px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition"
            >
              👤 My Profile
            </Link>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition"
            >
              🛟 Help & Support
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                onLogoutRequest();
              }}
              className="w-full text-left flex items-center px-3 py-2 text-[10px] font-black text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
            >
              🚪 Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );
}

export default function Navbar({ title = "Dashboard", role }) {
  const router = useRouter();
  const { logout, user: currentUser } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { open: openStudentNavDrawer } = useStudentNavDrawer();
  const { open: openInstructorNavDrawer } = useInstructorNavDrawer();
  const { open: openAdminNavDrawer } = useAdminNavDrawer();

  const pathname = usePathname();
  
  // Dynamic IDs scanner
  const getIdsFromPathname = () => {
    if (!pathname) return {};
    const segments = pathname.split("/").filter(Boolean);
    const hasCoursesInPath = segments.includes("courses");
    const result = {
      courseId: null,
      moduleId: null,
      lessonId: null,
      contentId: null,
      quizId: null,
      questionId: null,
    };
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg === "courses" && segments[i + 1] && !["create", "edit", "import"].includes(segments[i + 1])) {
        result.courseId = segments[i + 1];
      }
      if (seg === "modules" && segments[i + 1] && !["create", "edit"].includes(segments[i + 1])) {
        result.moduleId = segments[i + 1];
      }
      if (seg === "lessons" && segments[i + 1] && !["create", "edit"].includes(segments[i + 1])) {
        result.lessonId = segments[i + 1];
      }
      if (seg === "contents" && segments[i + 1] && !["create", "edit", "view"].includes(segments[i + 1])) {
        result.contentId = segments[i + 1];
      }
      if (seg === "quizzes") {
        if (segments[i + 1]) {
          if (["view", "edit"].includes(segments[i + 1])) {
            result.quizId = segments[i + 2];
          } else if (segments[i + 1] === "create") {
            result.courseId = segments[i + 2];
          } else {
            if (hasCoursesInPath) {
              result.quizId = segments[i + 1];
            } else {
              result.courseId = segments[i + 1];
            }
          }
        }
      }
      if (seg === "questions") {
        if (segments[i + 1]) {
          if (["view", "edit"].includes(segments[i + 1])) {
            result.questionId = segments[i + 2];
          } else if (segments[i + 1] === "create") {
            result.quizId = segments[i + 2];
          } else {
            result.quizId = segments[i + 1];
          }
        }
      }
    }
    return result;
  };

  const parsedIds = getIdsFromPathname();
  
  // Queries with React Query dynamic enabling (Instructor role only)
  const isInstructorRole = role === "INSTRUCTOR";
  const { data: moduleData } = useModule(parsedIds.moduleId, { enabled: !!parsedIds.moduleId && isInstructorRole });
  const { data: lessonData } = useLesson(parsedIds.lessonId, { enabled: !!parsedIds.lessonId && isInstructorRole });
  const { data: contentData } = useContent(parsedIds.contentId, { enabled: !!parsedIds.contentId && isInstructorRole });
  const { data: questionData } = useQuestion(parsedIds.questionId, { enabled: !!parsedIds.questionId && isInstructorRole });
  
  const quizId = parsedIds.quizId || questionData?.quizId;
  const { data: quizData } = useQuiz(quizId, { enabled: !!quizId && isInstructorRole });
  
  const courseId = parsedIds.courseId || moduleData?.courseId || lessonData?.module?.courseId || quizData?.courseId;
  // Breadcrumbs read only course.title / course.id, so this skips the whole
  // modules -> lessons -> topics -> contents tree. The navbar renders on every
  // instructor content page, so this was the widest-reaching over-fetch.
  const { data: course } = useInstructorCourse(courseId, { enabled: !!courseId && isInstructorRole, shallow: true });

  // Generate breadcrumb objects dynamically
  const getBreadcrumbs = () => {
    if (!pathname) return [];
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) {
      return [{ label: "DASHBOARD", href: null }];
    }

    const role = segments[0]; // "instructor", "student", "admin"
    const breadcrumbs = [];

    // Root link
    breadcrumbs.push({ label: "DASHBOARD", href: `/${role}/dashboard` });

    const hasCourses = segments.includes("courses");
    const hasModules = segments.includes("modules");
    const hasLessons = segments.includes("lessons");
    const hasContents = segments.includes("contents");
    const hasQuizzes = segments.includes("quizzes");
    const hasQuestions = segments.includes("questions");

    // Add Course parent
    if (hasCourses || hasModules || hasLessons || hasContents || hasQuizzes || hasQuestions) {
      breadcrumbs.push({ label: "COURSES", href: `/${role}/courses` });
      
      if (course) {
        breadcrumbs.push({ label: course.title, href: `/${role}/courses/${course.id}` });
      }
    }

    // Add Modules parent and Module details
    if (hasModules || hasLessons || hasContents) {
      if (moduleData) {
        breadcrumbs.push({ label: moduleData.title, href: `/${role}/modules/${moduleData.id}` });
      }
    }

    // Add Lessons parent and Lesson details
    if (hasLessons || hasContents) {
      if (lessonData) {
        breadcrumbs.push({ label: lessonData.title, href: `/${role}/lessons/${lessonData.id}` });
      }
    }

    // Add Content leaf node
    if (hasContents) {
      if (contentData) {
        breadcrumbs.push({ label: contentData.title, href: null });
      }
    }

    // Add Quiz parent and Quiz details
    if (hasQuizzes || hasQuestions) {
      breadcrumbs.push({ label: "QUIZZES", href: `/${role}/quizzes` });
      if (quizData) {
        breadcrumbs.push({ label: quizData.title, href: `/${role}/quizzes/view/${quizData.id}` });
      }
    }

    // Add Questions leaf node
    if (hasQuestions) {
      if (segments.includes("create")) {
        breadcrumbs.push({ label: "ADD QUESTION", href: null });
      } else if (segments.includes("edit")) {
        breadcrumbs.push({ label: "EDIT QUESTION", href: null });
      } else {
        const questionsHref = quizId ? `/${role}/questions/${quizId}` : null;
        breadcrumbs.push({ label: "QUESTIONS", href: questionsHref });
      }
    }

    // Handle Standalone sections
    const section = segments[1];
    const standalonePages = [
      "calendar", "profile", "assignments", "reports",
      "announcements", "modules", "lessons", "contents",
    ];
    if (standalonePages.includes(section)) {
      // The student portal's /assignments page is titled "Submissions".
      const label =
        segments[0] === "student" && section === "assignments" ? "SUBMISSIONS" : section.toUpperCase();
      breadcrumbs.push({ label, href: null });
    }

    // Handle Create/Edit static operations
    if (segments.includes("create") && !hasQuestions) {
      breadcrumbs.push({ label: "CREATE", href: null });
    }
    if (segments.includes("edit") && !hasQuestions) {
      breadcrumbs.push({ label: "EDIT", href: null });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const { 
    conversations = [], 
    setConversations,
    messages = [], 
    isOpen, 
    setIsOpen, 
    activeConversation, 
    setActiveConversation,
  } = useChat();

  const { notifications, markAllRead, clearAll, markAsRead, addNotification } = useNotification();
  const [isMounted, setIsMounted] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Client-side initialization to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen to new messages in all background conversations
  useEffect(() => {
    if (!isMounted || !conversations || conversations.length === 0) return;
    
    conversations.forEach((conv) => {
      if (conv.unread > 0 && conv.lastMessage) {
        const lastMsgText = conv.lastMessage;
        // The text alone is not enough to tell two messages apart — sending
        // "hiii" twice would key the same. `unread` and `lastSeen` both advance
        // when a message actually arrives and are otherwise stable across
        // renders, which is exactly the property a dedupe key needs.
        const notifId = `conv_${conv.id}_${conv.unread}_${conv.lastSeen || ""}_${lastMsgText.substring(0, 10)}`;
        
        // Don't show notification if we are actively focused on this conversation
        const isFocused = isOpen && activeConversation && activeConversation.id === conv.id;
        if (isFocused) return;
        
        // addNotification drops a repeat call for the same key, so the whole
        // stream can be replayed on every render without stacking toasts.
        addNotification(
          `New message from ${conv.name || "User"}`,
          lastMsgText,
          "chat",
          "",
          notifId
        );
      }
    });
  }, [conversations, isMounted, isOpen, activeConversation, addNotification]);

  // Listen to new messages in the currently active conversation
  useEffect(() => {
    if (!isMounted || !messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    const currentUserId = currentUser?.id || currentUser?._id;
    const msgSenderId = lastMsg.senderId || lastMsg.sender?._id || lastMsg.sender?.id;
    const isMine = lastMsg.sender === "me" || lastMsg.senderId === "me" || (currentUserId && msgSenderId && msgSenderId === currentUserId);
    
    // Don't show notification if the chat widget is open and focused on this conversation
    const isFocused = isOpen && activeConversation && (activeConversation.id === lastMsg.conversationId || lastMsg.conversationId === undefined);
    
    if (lastMsg && !isMine && !isFocused) {
      // Key off the message's own id; when the socket payload carries none, derive
      // one from its content instead. Anything render-stable works — what must NOT
      // be used here is Date.now(), which yields a fresh key every pass and so
      // never dedupes.
      const msgKey =
        lastMsg.id ||
        lastMsg._id ||
        `${lastMsg.conversationId || "conv"}_${(lastMsg.text || lastMsg.content || "").substring(0, 24)}_${lastMsg.createdAt || lastMsg.timestamp || ""}`;
      const notifId = `msg_${msgKey}`;

      addNotification(
        `New message from ${lastMsg.sender?.name || "User"}`,
        lastMsg.text || lastMsg.content || "Sent a message.",
        "chat",
        "",
        notifId
      );
    }
  }, [messages, currentUser, isMounted, isOpen, activeConversation, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    // logout() itself clears auth state and redirects to the Landing Page —
    // navigating here too would race it while cookies/user state are still
    // present, which is what let the old redirect bounce back into the app.
    logout();
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const handleClearAll = () => {
    clearAll();
  };

  const handleToggleRead = (id) => {
    markAsRead(id);
  };

  // Process notification clicks: mark read and close popup, NO route navigation (user stays on current page)
  const handleNotificationClick = (n) => {
    handleToggleRead(n.id);
    setShowNotifications(false);
  };

  if (role === 'INSTRUCTOR' || role === 'ADMIN') {
    const dashboardHref = role === 'ADMIN' ? '/admin/dashboard' : '/instructor/dashboard';
    const openRoleNavDrawer = role === 'ADMIN' ? openAdminNavDrawer : openInstructorNavDrawer;
    return (
      <>
      {/* sticky top-0, not scrolled-away static — matches the Student header
          below. Sticky over a true `fixed` here since the header sits first
          in the document flow with no scrolling/transformed ancestor between
          it and the viewport: visually identical to fixed, but content below
          keeps its natural space instead of needing compensating padding on
          every instructor/admin page that renders this navbar. */}
      <header className="bg-background border-b border-border text-foreground sticky top-0 z-40">
        {/* px-2 below sm: the 12px gutter pushed the drawer toggle and the
            action cluster into each other at 320px. */}
        <div className="px-2 sm:px-6 py-3 flex items-center gap-1.5 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            {/* Mobile menu toggle — opens the role's nav drawer (see
                Instructor/AdminNavDrawer). */}
            <button
              type="button"
              onClick={openRoleNavDrawer}
              aria-label="Open navigation menu"
              className="sm:hidden text-xl text-foreground mr-1"
            >
              <FaBars />
            </button>

            {/* Logo */}
            <Link href={dashboardHref} className="flex items-center gap-2 hover:opacity-90">
              <Image
                src="/images/logo.jpeg"
                alt="Orange Tree LMS"
                width={48}
                height={48}
                className="h-11 w-11 rounded-lg object-cover"
                priority
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm tracking-wider font-extrabold text-primary leading-none">ORANGE TREE</span>
                <span className="text-[9px] text-muted-foreground font-medium">Learn. Grow. Succeed.</span>
              </div>
            </Link>

          </div>

          {/* Primary nav — desktop only. On mobile, InstructorNavDrawer (opened via
              the hamburger button) already lists these same sections, so
              showing them here too would just duplicate that menu. */}
          {(role === 'INSTRUCTOR' || role === 'ADMIN') && (
            <div className="hidden sm:flex flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              {role === 'INSTRUCTOR' ? <NavigationStrip bare /> : <AdminNavigationStrip bare />}
            </div>
          )}
          <div className="flex-1 sm:hidden" />

          {/* Global search — icon-only on mobile (GlobalSearch already hides its
              own label/kbd-hint below sm), so no need to reserve a fixed width. */}
          {role === 'INSTRUCTOR' && (
            <div className="flex shrink-0">
              <GlobalSearch role="instructor" />
            </div>
          )}

          {/* Right side items */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">

            {/* No Messages button here — removed from the navbar for every
                role. Chat still opens from chat notifications. */}

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Notifications */}
            <NotificationsMenu
              notifications={notifications}
              unreadCount={isMounted ? unreadCount : 0}
              onMarkAllRead={handleMarkAllRead}
              onClearAll={handleClearAll}
              onItemClick={handleNotificationClick}
            />

            {/* Profile Dropdown */}
            <div className="relative">
              <ProfileDropdown onLogoutRequest={() => setShowLogoutModal(true)} user={currentUser} role={role} />
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-6 text-center py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to sign out of your account?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-foreground transition cursor-pointer"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </Modal>
      </>
    );
  }

  const isStudentRole = role === "STUDENT" || role === "student" || (!role && pathname?.includes("/student"));

  return (
    <>
      <header
        className={`
        ${role === 'INSTRUCTOR' ? 'bg-background border-border' : 'bg-background border-border'}
        border-b
        flex
        flex-col
        sticky
        top-0
        z-40
      `}
      >
        <div className="px-2 sm:px-6 py-3 flex items-center gap-1.5 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {isStudentRole && (
              <>
                <button
                  type="button"
                  onClick={openStudentNavDrawer}
                  aria-label="Open navigation menu"
                  className="sm:hidden shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
                <Link href="/student/dashboard" className="flex items-center gap-2 shrink-0 hover:opacity-90">
                  <Image
                    src="/images/logo.jpeg"
                    alt="Orange Tree LMS"
                    width={48}
                    height={48}
                    className="h-9 w-9 rounded-lg object-cover"
                    priority
                  />
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm tracking-wider font-extrabold text-primary leading-none">ORANGE TREE</span>
                    <span className="text-[9px] text-muted-foreground font-medium">Learn. Grow. Succeed.</span>
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* Primary nav — same in-header placement as Instructor's, desktop
              only. On mobile, StudentNavDrawer (hamburger) already lists
              these same sections, so showing them here too would duplicate
              that menu. */}
          {isStudentRole && (
            <div className="hidden sm:flex flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <StudentNavigationStrip bare />
            </div>
          )}
          {isStudentRole && <div className="flex-1 sm:hidden" />}

          {!isStudentRole && (
            <div className="flex-1 min-w-0">
              {breadcrumbs.length > 0 ? (
                <div
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pl-1 min-w-0 overflow-x-auto scrollbar-hide"
                >
                  {breadcrumbs.map((b, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <div key={idx} className="flex items-center gap-2 min-w-0">
                        {idx > 0 && <ChevronRight size={12} className="text-slate-700 stroke-[3] shrink-0" />}
                        {b.href && !isLast ? (
                          <Link href={b.href} className="text-muted-foreground hover:text-foreground transition truncate">
                            {b.label}
                          </Link>
                        ) : (
                          <span className={`truncate ${isLast && idx > 0 ? "text-primary font-black tracking-widest" : "text-foreground"}`}>
                            {b.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <h1 className="text-lg font-semibold truncate">{title}</h1>
              )}
            </div>
          )}

          <div className="flex gap-1.5 sm:gap-4 items-center relative shrink-0">

            {/* Global Search: Courses, Assignments, Live Classes, Notes —
                icon-only on mobile (GlobalSearch already hides its own
                label/kbd-hint below sm), so no need to reserve a fixed width. */}
            {isStudentRole && (
              <div className="flex shrink-0">
                <GlobalSearch />
              </div>
            )}

            {/* No Messages button here — removed from the navbar for every
                role. Chat still opens from chat notifications and the course
                player's Ask Instructor card. */}

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Notifications */}
            <NotificationsMenu
              notifications={notifications}
              unreadCount={isMounted ? unreadCount : 0}
              onMarkAllRead={handleMarkAllRead}
              onClearAll={handleClearAll}
              onItemClick={handleNotificationClick}
            />

            {/* Profile */}
            <ProfileMenu
              user={currentUser}
              onLogout={() => setShowLogoutModal(true)}
              profileHref={isStudentRole ? "/student/profile" : "/admin/profile"}
              // Settings is no longer offered to students — the entry is
              // dropped the same way it already was for every other role.
              settingsHref={null}
            />
          </div>
        </div>
      </header>

      {/* Calendar Modal Popup */}
      <Modal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Schedule Calendar"
        size="md"
      >
        <div className="text-foreground">
          <MiniCalendar role={currentUser?.role} />
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-6 text-center py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to sign out of your account?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-foreground transition cursor-pointer"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
