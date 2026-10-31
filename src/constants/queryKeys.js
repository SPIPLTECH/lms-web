export const QUERY_KEYS = {
    /** GET /sessions/me — the signed-in browser's own session (keep-alive). */
    SESSION_ME: "session-me",
    /** GET /playback/status — this account's playback lease, as this device sees it. */
    PLAYBACK_STATUS: "playback-status",

    // ==========================
    // Evaluator (temporary testing accounts)
    // ==========================
    EVALUATOR_REGISTRATION: "evaluator-registration",
    EVALUATOR_STATUS: "evaluator-status",

    // ==========================
    // Student
    // ==========================
    COURSES: "courses",
    COURSE: "course",
    MY_COURSES: "my-courses",
    STUDENT_DASHBOARD: "student-dashboard",
    STUDENT_PROFILE: "student-profile",
    STUDENT_CERTIFICATES: "student-certificates",
    STUDENT_STATE: "student-state",
    STUDENT_QUIZZES: "student-quizzes",
    STUDENT_QUESTIONS: "student-questions",
    STUDENT_ASSIGNMENTS: "student-assignments",
    STUDENT_ASSIGNMENT: "student-assignment",
    STUDENT_QUIZ_SUBMISSIONS: "student-quiz-submissions",
    STICKY_NOTES: "sticky-notes",
    TRANSCRIPT: "transcript",
    NOTES: "notes",
    BOOKMARKS: "bookmarks",
    MY_ACHIEVEMENTS: "my-achievements",
    DASHBOARD: "dashboard",
    NOTIFICATIONS: "notifications",
    COURSE_STATE: "course-state",
    LEARNING_PATH: "learning-path",
    LEARNING_SEQUENCE: "learning-sequence",
    RECOMMENDATIONS: "recommendations",
    NEXT_ACTION: "next-action",
    LEARNING_SIGNALS: "learning-signals",
    PROGRESS: "progress",
    COURSE_PROGRESS: "course-progress",

    // ==========================
    // AI Assistant
    // ==========================
    AI_CONVERSATIONS: "ai-conversations",
    AI_MESSAGES: "ai-messages",

    // ==========================
    // Admin
    // ==========================
    ADMIN_DASHBOARD: "admin-dashboard",

    ADMIN_USERS: "admin-users",
    ADMIN_USER: "admin-user",
    ADMIN_USER_SESSIONS: "admin-user-sessions",

    ADMIN_STUDENTS: "admin-students",
    ADMIN_STUDENT: "admin-student",

    ADMIN_INSTRUCTORS: "admin-instructors",

    ADMIN_COURSES: "admin-courses",
    ADMIN_COURSE: "admin-course",

    ADMIN_ENROLLMENTS: "admin-enrollments",

    PROFILE: "profile",
    ADMIN_PROFILE: "admin-profile",
    INSTRUCTOR_PROFILE: "instructor-profile",

    // ==========================
    // Instructor
    // ==========================
    INSTRUCTOR_DASHBOARD: "instructor-dashboard",

    INSTRUCTOR_COURSES: "instructor-courses",
    INSTRUCTOR_COURSES_TABLE: "instructor-courses-table",
    INSTRUCTOR_COURSE: "instructor-course",
    /** GET /courses/resolve/:key — a staff URL's readable course key -> id. */
    COURSE_KEY: "course-key",

    MODULES: "modules",
    MODULE: "module",

    LESSONS: "lessons",
    LESSON: "lesson",

    TOPICS: "topics",
    TOPIC: "topic",

    SUBTOPICS: "subtopics",
    SUBTOPIC: "subtopic",

    CONCEPTS: "concepts",
    CONCEPT: "concept",

    CONTENTS: "contents",
    CONTENT: "content",

    QUIZZES: "quizzes",
    QUIZ: "quiz",
    PROCTORING_CONFIG: "proctoring-config",
    PROCTORED_QUIZ_STATUS: "proctored-quiz-status",
    PROCTORED_ATTEMPT: "proctored-attempt",
    PROCTORED_ATTEMPT_RESULT: "proctored-attempt-result",

    QUESTIONS: "questions",
    QUESTION: "question",
    QUIZ_RESULT: "quiz-result",
    QUESTION_REPOSITORY: "question-repository",

    LESSON_NOTES: "lesson-notes",
    LESSON_QUERIES: "lesson-queries",
    MY_LESSON_QUERIES: "my-lesson-queries",
    MY_QUESTIONS: "my-questions",
    DISCUSSIONS: "discussions",

    EXAMS: "exams",
    EXAM: "exam",
    RESULTS: "results",
    ASSESSMENTS: "assessments",
    ASSIGNMENT_EVALUATION: "assignment-evaluation",
    EVALUATION_SYNONYMS: "evaluation-synonyms",
    COURSE_IMPORT_JOB: "course-import-job",
};