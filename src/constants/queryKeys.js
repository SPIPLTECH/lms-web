export const QUERY_KEYS = {
    // ==========================
    // Auth
    // ==========================
    AUTH_SESSION: "auth-session",

    // ==========================
    // Public / guest (no token required)
    // ==========================
    /** Guest-accessible published catalogue at /courses (GET /courses). */
    PUBLIC_COURSES: "public-courses",

    // ==========================
    // Student
    // ==========================
    COURSES: "courses",
    COURSE: "course",
    MY_COURSES: "my-courses",
    STORE_COURSES: "store-courses",
    STUDENT_DASHBOARD: "student-dashboard",
    PAYMENTS: "payments",
    PAYMENT_ORDERS: "payment-orders",
    UPCOMING_TASKS: "upcoming-tasks",
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
    LIVE_CLASSES: "live-classes",
    ACHIEVEMENTS: "achievements",
    MY_ACHIEVEMENTS: "my-achievements",
    DASHBOARD: "dashboard",
    ENTRY_ASSESSMENT: "entry-assessment",
    CALENDAR: "calendar_events",
    NOTIFICATIONS: "notifications",
    COURSE_STATE: "course-state",
    LEARNING_PATH: "learning-path",
    COURSE_REVIEWS: "course-reviews",
    COURSE_REVIEW_STATS: "course-review-stats",
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

    ADMIN_STUDENTS: "admin-students",
    ADMIN_STUDENT: "admin-student",

    ADMIN_INSTRUCTORS: "admin-instructors",
    ADMIN_INSTRUCTOR: "admin-instructor",

    ADMIN_COURSES: "admin-courses",
    ADMIN_COURSE: "admin-course",

    ADMIN_ENROLLMENTS: "admin-enrollments",
    ADMIN_ENROLLMENT: "admin-enrollment",

    ADMIN_CERTIFICATES: "admin-certificates",

    ADMIN_CALENDAR_EVENTS: "admin-calendar-events",

    PROFILE: "profile",
    ADMIN_PROFILE: "admin-profile",
    INSTRUCTOR_PROFILE: "instructor-profile",

    // ==========================
    // Instructor
    // ==========================
    INSTRUCTOR_DASHBOARD: "instructor-dashboard",

    INSTRUCTOR_COURSES: "instructor-courses",
    INSTRUCTOR_COURSES_TABLE: "instructor-courses-table",
    /** Server-computed summary counts (GET /courses/stats/mine) — never a list. */
    INSTRUCTOR_COURSE_STATS: "instructor-course-stats",
    INSTRUCTOR_COURSE: "instructor-course",

    MODULES: "modules",
    MODULE: "module",

    LESSONS: "lessons",
    LESSON: "lesson",

    TOPICS: "topics",
    TOPIC: "topic",

    CONTENTS: "contents",
    CONTENT: "content",
    CONTENT_SUBMISSION: "content-submission",

    QUIZZES: "quizzes",
    QUIZ: "quiz",

    QUESTIONS: "questions",
    QUESTION: "question",
    QUIZ_RESULT: "quiz-result",
    QUESTION_REPOSITORY: "question-repository",

    LESSON_NOTES: "lesson-notes",
    LESSON_QUERIES: "lesson-queries",
    MY_LESSON_QUERIES: "my-lesson-queries",
    MY_QUESTIONS: "my-questions",
    DISCUSSIONS: "discussions",

    BATCHES: "batches",
    MY_BATCHES: "my-batches",
    BATCH_DETAIL: "batch-detail",
    BATCH_ENROLLABLE_STUDENTS: "batch-enrollable-students",
    BATCH_PERFORMANCE_OVERVIEW: "batch-performance-overview",
    BATCH_DASHBOARD: "batch-dashboard",
    BATCH_ANNOUNCEMENTS: "batch-announcements",
    BATCH_QUIZZES: "batch-quizzes",
    EXAMS: "exams",
    EXAM: "exam",
    MY_REVIEWS: "my-reviews",
    RESULTS: "results",
    ASSESSMENTS: "assessments",
    INSTRUCTOR_CERTIFICATES: "instructor-certificates",
    COURSE_IMPORT_JOB: "course-import-job",
};