import {
    BookOpen,
    CheckCircle2,
    GraduationCap,
    Lightbulb,
    PlayCircle,
    RotateCcw,
    Trophy,
} from "lucide-react";

/**
 * Presentation for the server's next-action vocabulary.
 *
 * Shared by every surface that renders a next action (the dashboard and
 * player card, the quiz result page's next step) so the same action never
 * looks like two different things depending on where it's shown. The
 * vocabulary itself is the backend's — see nextAction.service.js — and
 * nothing here decides an action, only how one looks and where it points.
 */

/**
 * The action names the backend sends. Mirrors NEXT_ACTION in
 * nextAction.service.js — a name for the strings rather than a second
 * vocabulary, so a surface that needs to react to a specific action doesn't
 * do it with a bare string literal.
 */
export const NEXT_ACTION = {
    COURSE_COMPLETED: "COURSE_COMPLETED",
    REVIEW_MISCONCEPTION: "REVIEW_MISCONCEPTION",
    REVIEW_TOPIC: "REVIEW_TOPIC",
    PRACTICE_TOPIC: "PRACTICE_TOPIC",
    TAKE_QUALIFYING_TEST: "TAKE_QUALIFYING_TEST",
    RETRY_QUALIFYING_TEST: "RETRY_QUALIFYING_TEST",
    RETRY_QUIZ: "RETRY_QUIZ",
    CONTINUE_TO_NEXT_LESSON: "CONTINUE_TO_NEXT_LESSON",
    CONTINUE_LEARNING: "CONTINUE_LEARNING",
    NOTHING_TO_DO: "NOTHING_TO_DO",
};

export const ACTION_STYLE = {
    COURSE_COMPLETED: { icon: Trophy, tone: "emerald" },
    REVIEW_TOPIC: { icon: BookOpen, tone: "amber" },
    REVIEW_MISCONCEPTION: { icon: Lightbulb, tone: "amber" },
    PRACTICE_TOPIC: { icon: Lightbulb, tone: "sky" },
    TAKE_QUALIFYING_TEST: { icon: GraduationCap, tone: "violet" },
    RETRY_QUALIFYING_TEST: { icon: RotateCcw, tone: "violet" },
    RETRY_QUIZ: { icon: RotateCcw, tone: "amber" },
    CONTINUE_TO_NEXT_LESSON: { icon: PlayCircle, tone: "primary" },
    CONTINUE_LEARNING: { icon: PlayCircle, tone: "primary" },
    NOTHING_TO_DO: { icon: CheckCircle2, tone: "muted" },
};

export const TONE_CLASSES = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    sky: "border-sky-500/30 bg-sky-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
    primary: "border-primary/25 bg-primary/5",
    muted: "border-border bg-card",
};

export const ICON_CLASSES = {
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    primary: "bg-primary/15 text-primary",
    muted: "bg-muted text-muted-foreground",
};

export const styleFor = (action) => ACTION_STYLE[action] || ACTION_STYLE.CONTINUE_LEARNING;

/**
 * Where an action points. A quiz action opens the attempt flow; anything else
 * opens the course player on the right lesson, which then applies the
 * sequential rules — so a next action can never become a way past locked
 * content.
 *
 * `from` threads the page the student is on through to the attempt, so a
 * retake launched from a result page comes back to where it started.
 */
export function actionHref(action, { from = null } = {}) {
    const target = action?.target;
    if (!target?.courseId) return null;

    if (target.quizId) {
        const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
        return `/student/attempt/${target.quizId}${suffix}`;
    }

    const params = new URLSearchParams();
    if (target.lessonId) params.set("lessonId", target.lessonId);
    const query = params.toString();
    return `/student/learn/${target.courseId}${query ? `?${query}` : ""}`;
}
