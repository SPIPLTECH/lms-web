/**
 * Builds the downloadable sample course package.
 *
 * This is a *physical* course package: the Course -> Modules -> Lessons ->
 * Topics hierarchy exists as real folders in the ZIP, and each artifact is a
 * real file in the folder that gives it its meaning. There is deliberately no
 * course.json — an instructor who extracts this ZIP should be able to read the
 * shape of a course straight off the directory tree.
 *
 * Artifact formats follow what the LMS already reads:
 *   Quiz       -> .csv  (the question columns from ImportQuestionsModal,
 *                        prefixed with the quiz's own settings)
 *   Assignment -> .md   (YAML frontmatter + brief)
 *   Content    -> .md   (YAML frontmatter + body) alongside real media files
 *
 * Sample subject matches the C Programming Fundamentals data already used by
 * the import page's template.
 */

/** Structural folder names. The importer keys off these exact names. */
const PACKAGE_FOLDERS = {
  ROOT: "Course",
  MODULES: "Modules",
  LESSONS: "Lessons",
  TOPICS: "Topics",
  DIRECT_QUIZ: "Direct Quiz",
  DIRECT_ASSIGNMENT: "Direct Assignment",
  DIRECT_CONTENT: "Direct Content",
  TOPIC_QUIZ: "Quiz",
  TOPIC_ASSIGNMENT: "Assignment",
  TOPIC_CONTENT: "Content",
};

/** Column order for quiz CSVs. First three carry quiz-level settings. */
const QUIZ_CSV_HEADER =
  "quizTag,passingScore,timeLimit,question,optionA,optionB,optionC,optionD,correctAnswer,marks,difficulty,explanation";

/** Quotes a CSV cell, doubling embedded quotes. */
const cell = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Renders a quiz CSV. Quiz settings repeat on every row — the same way the
 * existing question-upload sample CSV carries per-row title/type/subject.
 */
const buildQuizCsv = ({ quizTag, passingScore, timeLimit, questions }) => {
  const rows = questions.map((q) =>
    [
      quizTag,
      passingScore,
      timeLimit ?? "",
      q.question,
      q.optionA ?? "",
      q.optionB ?? "",
      q.optionC ?? "",
      q.optionD ?? "",
      q.correctAnswer,
      q.marks ?? 1,
      q.difficulty ?? "MEDIUM",
      q.explanation ?? "",
    ]
      .map(cell)
      .join(",")
  );

  return [QUIZ_CSV_HEADER, ...rows].join("\n") + "\n";
};

/** Renders a markdown file with a YAML frontmatter block. */
const buildMarkdown = (frontmatter, body) => {
  const lines = Object.entries(frontmatter)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`);

  return `---\n${lines.join("\n")}\n---\n\n${body.trim()}\n`;
};

/** 8x8 PNG, referenced by Course Content.md. */
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP4WSyGFTEMLQkA7bNggdHW5fAAAAAASUVORK5CYII=";

/** Minimal valid MP4 container, standalone video content under Topic 1. */
const SAMPLE_MP4_BASE64 =
  "AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAABBtZGF0AAAAAAAAAAAAAAG9bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAUl0cmFrAAAAXHRraGQAAAAHAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAUAAAADwAAAAAADlbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAD6AAAA+hVxAAAAAAAIWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAAAAAAAAnG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAFxzdGJsAAAAEHN0c2QAAAAAAAAAAAAAABBzdHRzAAAAAAAAAAAAAAAQc3RzYwAAAAAAAAAAAAAAFHN0c3oAAAAAAAAAAAAAAAAAAAAQc3RjbwAAAAAAAAAA";

/** Decodes base64 into a Uint8Array for JSZip. */
const fromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/* -------------------------------------------------------------------------- */
/* Sample course data — C Programming Fundamentals                             */
/* -------------------------------------------------------------------------- */

const COURSE_QUIZ = {
  quizTag: "FINAL",
  passingScore: 60,
  timeLimit: 30,
  questions: [
    {
      question: "Which header file is required to use printf()?",
      optionA: "<stdio.h>",
      optionB: "<stdlib.h>",
      optionC: "<string.h>",
      optionD: "<math.h>",
      correctAnswer: "<stdio.h>",
      marks: 1,
      difficulty: "EASY",
      explanation: "printf() is declared in stdio.h.",
    },
    {
      question: "Which operator returns the address of a variable?",
      optionA: "*",
      optionB: "&",
      optionC: "->",
      optionD: "%",
      correctAnswer: "&",
      marks: 2,
      difficulty: "MEDIUM",
      explanation: "The & operator yields the address of its operand.",
    },
  ],
};

const MODULE_QUIZ = {
  quizTag: "FINAL",
  passingScore: 60,
  timeLimit: 20,
  questions: [
    {
      question: "What is the entry point of every C program?",
      optionA: "start()",
      optionB: "main()",
      optionC: "run()",
      optionD: "execute()",
      correctAnswer: "main()",
      marks: 1,
      difficulty: "EASY",
      explanation: "Execution always begins at main().",
    },
  ],
};

const LESSON_QUIZ = {
  quizTag: "FINAL",
  passingScore: 60,
  timeLimit: 15,
  questions: [
    {
      question: "How many bytes does a char occupy in standard C?",
      optionA: "1",
      optionB: "2",
      optionC: "4",
      optionD: "8",
      correctAnswer: "1",
      marks: 1,
      difficulty: "EASY",
      explanation: "sizeof(char) is 1 by definition.",
    },
  ],
};

/** Topic quiz demonstrates the untimed self-assessed tag. */
const TOPIC_QUIZ = {
  quizTag: "SELF_TEST",
  passingScore: 50,
  timeLimit: null,
  questions: [
    {
      question: "Which keyword declares a variable that cannot be reassigned?",
      optionA: "static",
      optionB: "const",
      optionC: "volatile",
      optionD: "register",
      correctAnswer: "const",
      marks: 1,
      difficulty: "EASY",
      explanation: "const marks a value as read-only after initialisation.",
    },
  ],
};

/**
 * Writes the approved package tree into a JSZip instance.
 *
 * @param {import("jszip")} zip A JSZip instance to populate.
 * @returns {import("jszip")} The same instance, for chaining.
 */
export const buildSampleCoursePackage = (zip) => {
  const F = PACKAGE_FOLDERS;
  const course = zip.folder(F.ROOT);

  /* ---- Course level ---- */
  course
    .folder(F.DIRECT_QUIZ)
    .file("Course Final Quiz.csv", buildQuizCsv(COURSE_QUIZ));

  course.folder(F.DIRECT_ASSIGNMENT).file(
    "Course Assignment.md",
    buildMarkdown(
      {
        title: "Build a Command-Line Calculator",
        dueDate: "2026-12-15",
        marks: 100,
        assessmentType: "PROJECT",
        estimatedTime: 240,
      },
      `# Build a Command-Line Calculator

Write a C program that reads two numbers and an operator, then prints the result.

## Requirements
- Support \`+\`, \`-\`, \`*\` and \`/\`
- Reject division by zero with a clear message
- Validate input and exit cleanly when it is malformed

## Submission
Submit a single \`calculator.c\` file that compiles with \`gcc calculator.c\`.`
    )
  );

  const courseContent = course.folder(F.DIRECT_CONTENT);
  courseContent.file(
    "Course Content.md",
    buildMarkdown(
      { title: "How This Course Works", type: "HTML", order: 1, duration: 5 },
      `# How This Course Works

This course moves from C syntax through to memory and pointers. Each module
closes with a graded final quiz, while individual topics carry untimed
self-tests you can retake as often as you like.

![Course overview](course-overview.png)`
    )
  );
  courseContent.file("course-overview.png", fromBase64(SAMPLE_PNG_BASE64));

  /* ---- Module level ---- */
  const module1 = course.folder(F.MODULES).folder("Module 1");

  module1
    .folder(F.DIRECT_QUIZ)
    .file("Module Final Quiz.csv", buildQuizCsv(MODULE_QUIZ));

  module1.folder(F.DIRECT_ASSIGNMENT).file(
    "Module Assignment.md",
    buildMarkdown(
      {
        title: "Trace a Program's Execution",
        dueDate: "2026-11-30",
        marks: 50,
        assessmentType: "HOMEWORK",
        estimatedTime: 90,
      },
      `# Trace a Program's Execution

Given the program below, write down the value of every variable after each
statement, then explain what the program prints and why.`
    )
  );

  module1.folder(F.DIRECT_CONTENT).file(
    "Module Content.md",
    buildMarkdown(
      { title: "What You Will Build", type: "HTML", order: 1, duration: 3 },
      `# What You Will Build

By the end of this module you will have written, compiled and debugged your
first complete C program.`
    )
  );

  /* ---- Lesson level ---- */
  const lesson1 = module1.folder(F.LESSONS).folder("Lesson 1");

  lesson1
    .folder(F.DIRECT_QUIZ)
    .file("Lesson Final Quiz.csv", buildQuizCsv(LESSON_QUIZ));

  lesson1.folder(F.DIRECT_ASSIGNMENT).file(
    "Lesson Assignment.md",
    buildMarkdown(
      {
        title: "Declare and Print Five Variables",
        dueDate: "2026-11-20",
        marks: 20,
        assessmentType: "EXERCISE",
        estimatedTime: 30,
      },
      `# Declare and Print Five Variables

Declare one variable of each primitive type, assign each a value, and print all
five with a single \`printf()\` call.`
    )
  );

  lesson1.folder(F.DIRECT_CONTENT).file(
    "Lesson Content.md",
    buildMarkdown(
      { title: "Primitive Types at a Glance", type: "HTML", order: 1, duration: 4 },
      `# Primitive Types at a Glance

| Type | Typical size | Holds |
| --- | --- | --- |
| \`char\` | 1 byte | A single character |
| \`int\` | 4 bytes | Whole numbers |
| \`float\` | 4 bytes | Approximate decimals |
| \`double\` | 8 bytes | Higher-precision decimals |`
    )
  );

  /* ---- Topic level ---- */
  const topic1 = lesson1.folder(F.TOPICS).folder("Topic 1");

  const topicContent = topic1.folder(F.TOPIC_CONTENT);
  topicContent.file(
    "Topic Content.md",
    buildMarkdown(
      { title: "Declaring Your First Variable", type: "HTML", order: 1, duration: 6 },
      `# Declaring Your First Variable

A declaration names a value and fixes its type:

\`\`\`c
int attempts = 3;
\`\`\`

The type tells the compiler how much memory to reserve and how to interpret the
bytes stored there.`
    )
  );
  topicContent.file("topic-demo.mp4", fromBase64(SAMPLE_MP4_BASE64));

  topic1.folder(F.TOPIC_QUIZ).file("Topic Quiz.csv", buildQuizCsv(TOPIC_QUIZ));

  topic1.folder(F.TOPIC_ASSIGNMENT).file(
    "Topic Assignment.md",
    buildMarkdown(
      {
        title: "Fix the Broken Declaration",
        dueDate: "2026-11-15",
        marks: 10,
        assessmentType: "EXERCISE",
        estimatedTime: 15,
      },
      `# Fix the Broken Declaration

The snippet below does not compile. Identify the problem, correct it, and
explain in one sentence why the original was invalid.

\`\`\`c
int 2ndAttempt = 3;
\`\`\``
    )
  );

  return zip;
};

