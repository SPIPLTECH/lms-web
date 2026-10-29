"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import DashboardNavbar from "@/components/layouts/DashboardNavbar";
import { useAuth } from "@/context/AuthContext";
import { QaProvider } from "@/context/QaContext";
import Loader from "@/components/common/Loader";
import { StudentBottomTabs } from "@/components/layouts/StudentBottomBar";
import { AiLauncherProvider } from "@/features/ai-assistant/context/AiLauncherContext";
import { AiAssistantWidget } from "@/features/ai-assistant/components";
import ContentAccessGuard from "@/components/student/learning/ContentAccessGuard";
import { isCourseContentPath } from "@/lib/sessionErrors";
import EvaluatorNotice from "@/components/evaluator/EvaluatorNotice";
import useEvaluatorState from "@/hooks/useEvaluatorState";
import { EVALUATOR_STATES, EVALUATOR_ACCESS_PATH } from "@/lib/evaluatorAccess";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Temporary evaluator accounts: full access for 2 days, then no student
  // page (the access page asks for feedback if it hasn't been given). The API
  // refuses the same requests; this just sends the browser to the page that
  // says why, typed URL or not.
  const evaluatorState = useEvaluatorState(user?.evaluator);
  const evaluatorBlocked = Boolean(evaluatorState) && evaluatorState !== EVALUATOR_STATES.ACTIVE;

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "STUDENT") {
        router.replace("/");
      } else if (evaluatorBlocked) {
        router.replace(EVALUATOR_ACCESS_PATH);
      }
    }
  }, [user, loading, router, evaluatorBlocked]);

  if (loading || evaluatorBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader />
      </div>
    );
  }

  if (!user || user.role !== "STUDENT") {
    return null; // Let the useEffect redirect
  }

  const isLearnPage = pathname?.includes("/student/learn/");

  // Pages that show course content follow the account's playback lease: while
  // another device of this account is playing, they show why instead.
  const content = (
    <ContentAccessGuard enabled={isCourseContentPath(pathname)}>{children}</ContentAccessGuard>
  );

  if (isLearnPage) {
    // Same top bar as every other Student page, but the learn page still
    // owns its own fixed-viewport, internally-scrolling layout below it
    // (not DashboardLayout's Sidebar/padded <main>/ChatWidget — the learn
    // page already renders its own ChatWidget).
    // h-dvh, not h-screen: on a phone 100vh is the height with the browser's
    // address bar hidden, so while the bar shows, the bottom of this shell
    // (Previous/Next) sat behind it and under the fixed AI launcher. The
    // dynamic viewport follows the bar; on desktop the two are the same.
    // On phones the learn page renders its own bottom bar (Previous | Ask AI
    // | Next) instead of the tabs.
    return (
      <QaProvider>
        <AiLauncherProvider>
          <div className="h-dvh flex flex-col overflow-hidden">
            <DashboardNavbar role="STUDENT" title="Learning Workspace" />
            <div className="flex-1 min-h-0">{content}</div>
          </div>
        </AiLauncherProvider>
      </QaProvider>
    );
  }

  const evaluatorBanner =
    evaluatorState === EVALUATOR_STATES.ACTIVE ? (
      <div className="max-w-[1600px] mx-auto">
        <EvaluatorNotice evaluator={user.evaluator} />
      </div>
    ) : null;

  // Phones navigate with the bottom bar (Learning | Ask AI | Submissions).
  // Not during a quiz attempt, where one stray tap shouldn't leave it. The
  // fallback widget is what Ask AI opens on pages without their own widget;
  // it has no launcher of its own, so wider screens are unchanged.
  const bottomTabs = pathname?.startsWith("/student/attempt") ? null : (
    <>
      <StudentBottomTabs />
      <AiAssistantWidget fallback />
    </>
  );

  return (
    <QaProvider>
      <AiLauncherProvider>
        <DashboardLayout
          role="STUDENT"
          title="Student Dashboard"
          banner={evaluatorBanner}
        >
          <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
            {content}
          </div>
        </DashboardLayout>
        {bottomTabs}
      </AiLauncherProvider>
    </QaProvider>
  );
}
