"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  ArrowLeft,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Wand2,
  BookOpen,
  Layers,
  FileArchive,
  FileCode,
  Upload,
  Clipboard,
  Download,
  HelpCircle,
  X,
  FileJson,
} from "lucide-react";
import AiComposerModal from "@/components/instructor/composer/AiComposerModal";
import {
  useUploadZipPackage,
  useProcessZipJob,
  useProcessJsonCourse,
  useCourseJsonTemplate,
  useCourseImportJobStatus,
  useImportCourseJob,
} from "@/hooks/queries/instructor/useCourseImport";
import ZipImportTimeline, {
  stageIndexOf,
} from "@/components/instructor/courses/ZipImportTimeline";
import { buildSampleCoursePackage } from "@/lib/sampleCoursePackage";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useGenerateAiContent } from "@/hooks/queries/instructor/useGenerateAiContent";

/** Example prompts covering diverse disciplines */
const EXAMPLE_PROMPTS = [
  {
    label: "Beginner Python",
    text: "Create a beginner Python programming course for college students. Cover variables, control flow, functions, OOP, and data structures with practical code examples and quizzes.",
  },
  {
    label: "Java Spring Boot",
    text: "Create a comprehensive Java Full Stack backend course for intermediate developers covering Spring Boot, REST APIs, Microservices, Security, and PostgreSQL database integration.",
  },
  {
    label: "High School Physics",
    text: "Create a 6-week introductory Physics course for high school students covering Newtonian mechanics, gravity, motion, energy, and momentum with interactive concept checks.",
  },
  {
    label: "Corporate Cybersecurity",
    text: "Create employee training for cybersecurity awareness. Cover phishing prevention, password security, social engineering, remote work safety, and practical assessments.",
  },
  {
    label: "Digital Marketing",
    text: "Create a digital marketing course covering SEO fundamentals, content strategy, social media advertising, email marketing, and Google Analytics.",
  },
];

/**
 * Stages the backend moves through inside POST /jobs/:id/process. While the job
 * sits in one of these, the page polls it so the timeline follows the real
 * status instead of guessing which step is running.
 */
const ZIP_PROCESSING_STATUSES = ["UPLOADED", "EXTRACTING", "ANALYZING", "MAPPING"];

/** Generation Pipeline Staged Steps for User Feedback */
const STAGED_STEPS = [
  { id: 1, label: "Understanding your requirements", desc: "Parsing topic, level, and goals" },
  { id: 2, label: "Designing course structure", desc: "Organizing modules, lessons, and topics" },
  { id: 3, label: "Generating learning content", desc: "Drafting lesson explanations and examples" },
  { id: 4, label: "Creating assessments", desc: "Building module quizzes and question sets" },
];

/**
 * Fallback course JSON template, used only when GET /course-import/template is
 * unreachable. Same conventions as the backend's reference template: it shows
 * HOW course JSON is written, and every element in it is optional.
 */
const FALLBACK_TEMPLATE = {
  course: {
    title: "Introduction to Physics",
    description: "A beginner-friendly introduction to measurement and motion.",
    category: "Physics",
    level: "Beginner",
    status: "DRAFT",
    visibility: "PUBLIC",
    language: "English",
    tags: ["physics", "beginner"],
    certificatesEnabled: false,
    discussionEnabled: true,
    estimatedLearningHours: 15,
  },
  content: [
    {
      type: "HTML",
      title: "What is Physics?",
      htmlContent: "<p>Physics is the study of matter, energy, motion and forces.</p>",
    },
  ],
  modules: [
    {
      courseId: "course_physics_1",
      title: "Units and Measurements",
      description: "How physical quantities are measured.",
      content: [],
      lessons: [
        {
          moduleId: "physics_mod_1",
          title: "Physical Quantities and SI Units",
          isPublished: false,
          content: [],
          topics: [
            {
              lessonId: "physics_lesson_1",
              title: "SI Base Units",
              isPublished: false,
              content: [],
              quiz: {
                title: "SI Units Quick Check",
                courseId: "course_physics_1",
                moduleId: "physics_mod_1",
                lessonId: "physics_lesson_1",
                topicId: "physics_topic_1",
                quizTag: "SELF_TEST",
                passingScore: 50,
                questions: [
                  {
                    question: "What is the SI unit of length?",
                    questionType: "MCQ_SINGLE",
                    options: ["Kilogram", "Metre", "Second", "Newton"],
                    correctAnswer: "Metre",
                    marks: 1,
                    difficulty: "EASY",
                    explanation: "The metre is the SI base unit of length.",
                  },
                ],
              },
              assignment: {
                title: "Identify Physical Units",
                courseId: "course_physics_1",
                moduleId: "physics_mod_1",
                lessonId: "physics_lesson_1",
                topicId: "physics_topic_1",
                dueDate: "2026-11-15T23:59:00.000Z",
                marks: 10,
                assessmentType: "EXERCISE",
                estimatedTime: 15,
                description: "Identify the SI units for different physical quantities.",
              },
            },
          ],
        },
      ],
    },
  ],
};

export default function CourseImportPage() {
  const router = useRouter();

  // Primary Prompt State
  const [prompt, setPrompt] = useState("");

  // Advanced Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [level, setLevel] = useState("AUTO");
  const [targetAudience, setTargetAudience] = useState("");
  const [language, setLanguage] = useState("English");
  const [size, setSize] = useState("AUTO");

  // Workflow State: "INPUT" | "GENERATING" | "PREVIEW"
  const [workflowState, setWorkflowState] = useState("INPUT");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  // ZIP Import State
  // ZIP import lifecycle. `zipStatus` is a real CourseImportStatus once the
  // package is in the backend's hands; "SELECTED" is the only client-side
  // value, covering the gap between picking a file and uploading it.
  const [zipFile, setZipFile] = useState(null);
  const [zipStatus, setZipStatus] = useState(null);
  const [zipJobId, setZipJobId] = useState(null);
  const [zipFailedAt, setZipFailedAt] = useState(null);
  const [zipReadyJob, setZipReadyJob] = useState(null);
  const [zipError, setZipError] = useState("");
  const [zipErrors, setZipErrors] = useState([]);
  const [zipCreatedCourseId, setZipCreatedCourseId] = useState(null);
  const lastZipStageRef = useRef("SELECTED");
  const zipInputRef = useRef(null);

  // JSON File Import Ref
  const jsonInputRef = useRef(null);

  // Modals State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState("");
  const [pasteValidationErrors, setPasteValidationErrors] = useState([]);

  const [showFormatGuideModal, setShowFormatGuideModal] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [isAskAiModalOpen, setIsAskAiModalOpen] = useState(false);

  // Global Error & Validation State
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  // Import Hooks
  const uploadZipMutation = useUploadZipPackage();
  const processZipMutation = useProcessZipJob();
  const processJsonMutation = useProcessJsonCourse();
  const generateAiMutation = useGenerateAiContent();
  const importCourseJobMutation = useImportCourseJob();
  const { refetch: refetchTemplate } = useCourseJsonTemplate();
  const queryClient = useQueryClient();

  const isZipProcessing = ZIP_PROCESSING_STATUSES.includes(zipStatus);
  const { data: polledZipJob } = useCourseImportJobStatus(
    zipJobId,
    Boolean(zipJobId) && isZipProcessing
  );

  /**
   * Moves the timeline forward only. Polls can land out of order, and a stage
   * that already finished must never appear to be pending again. FAILED is the
   * one status allowed to interrupt the sequence.
   */
  const advanceZipStatus = useCallback((next) => {
    if (!next) return;
    setZipStatus((prev) => {
      if (prev === "FAILED") return prev;
      if (next === "FAILED") return next;
      return stageIndexOf(next) > stageIndexOf(prev) ? next : prev;
    });
  }, []);

  // Remember the furthest real stage so a failure can be attributed to the
  // step that actually broke — FAILED on its own doesn't say where it stopped.
  useEffect(() => {
    if (zipStatus && zipStatus !== "FAILED") lastZipStageRef.current = zipStatus;
  }, [zipStatus]);

  useEffect(() => {
    const polledStatus = polledZipJob?.status;
    if (!polledStatus) return;

    if (polledStatus === "FAILED") {
      setZipFailedAt(lastZipStageRef.current);
      setZipError(polledZipJob?.errorMessage || "The package could not be processed.");
      setZipErrors(polledZipJob?.validationReport?.errors || []);
      advanceZipStatus("FAILED");
      return;
    }

    // The poll only reveals the stages that run inside /process. READY is left
    // to the process response itself, which is the thing that carries the
    // canonical JSON the READY summary and the composer handoff both need.
    if (ZIP_PROCESSING_STATUSES.includes(polledStatus)) {
      advanceZipStatus(polledStatus);
    }
  }, [polledZipJob, advanceZipStatus]);

  // A physical package arrives fully validated and is written straight to the
  // LMS from here. A course.json package keeps its composer review step.
  const isPhysicalZipPackage = zipReadyJob?.canonicalJson?.packageFormat === "PHYSICAL_V1";

  /** Counts for the READY summary, using the page's existing count convention. */
  const zipSummary = useMemo(() => {
    const canonical = zipReadyJob?.canonicalJson;
    if (!canonical) return null;

    if (canonical.packageFormat === "PHYSICAL_V1") {
      const course = canonical.course || {};
      const mods = Array.isArray(course.modules) ? course.modules : [];
      const lessons = mods.flatMap((m) => (Array.isArray(m.lessons) ? m.lessons : []));
      const topics = lessons.flatMap((l) => (Array.isArray(l.topics) ? l.topics : []));
      const levels = [course, ...mods, ...lessons, ...topics];

      return {
        title: course.title || canonical?.metadata?.title || "Imported course",
        modules: mods.length,
        lessons: lessons.length,
        quizzes: levels.reduce((acc, l) => acc + (Array.isArray(l.quizzes) ? l.quizzes.length : 0), 0),
      };
    }

    const mods = Array.isArray(canonical.modules) ? canonical.modules : [];
    const courseQuizzes = Array.isArray(canonical.quizzes) ? canonical.quizzes : [];

    return {
      title: canonical?.metadata?.title || "Imported course",
      modules: mods.length,
      lessons: mods.reduce((acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0),
      quizzes:
        mods.reduce((acc, m) => acc + (Array.isArray(m.quizzes) ? m.quizzes.length : 0), 0) +
        courseQuizzes.length,
    };
  }, [zipReadyJob]);

  /** Assigns client-side UUIDs to canonical draft nodes for Composer compatibility */
  const withDraftIds = (modules = [], courseQuizzes = []) => {
    const mappedQuizzes = (courseQuizzes || []).map((quiz) => ({
      ...quiz,
      id: quiz.id || crypto.randomUUID(),
      questions: (quiz.questions || []).map((q) => ({
        ...q,
        id: q.id || crypto.randomUUID(),
      })),
    }));

    const mappedModules = (modules || []).map((mod) => ({
      ...mod,
      id: mod.id || crypto.randomUUID(),
      quizzes: (mod.quizzes || []).map((quiz) => ({
        ...quiz,
        id: quiz.id || crypto.randomUUID(),
        questions: (quiz.questions || []).map((q) => ({
          ...q,
          id: q.id || crypto.randomUUID(),
        })),
      })),
      lessons: (mod.lessons || []).map((lesson) => ({
        ...lesson,
        id: lesson.id || crypto.randomUUID(),
        topics: (lesson.topics || []).map((topic) => ({
          ...topic,
          id: topic.id || crypto.randomUUID(),
          contents: (topic.contents || []).map((content) => ({
            ...content,
            id: content.id || crypto.randomUUID(),
          })),
        })),
      })),
    }));

    return { modules: mappedModules, quizzes: mappedQuizzes };
  };

  /** Saves temporary draft payload to sessionStorage and opens Course Composer */
  const prepareDraftAndNavigate = (canonical, jobId = null) => {
    try {
      const targetObj = canonical?.metadata || canonical?.modules ? canonical : (canonical?.course || canonical || {});
      const metadata = targetObj.metadata || targetObj || {};
      const settings = targetObj.settings || {};
      const rawModules = Array.isArray(targetObj.modules) ? targetObj.modules : [];
      const rawQuizzes = Array.isArray(targetObj.quizzes) ? targetObj.quizzes : [];

      const { modules, quizzes } = withDraftIds(rawModules, rawQuizzes);
      const assetMap = canonical?.assetMap || targetObj?.assetMap || {};

      const thumbnailRef = metadata.thumbnailUrl || metadata.thumbnail;

      const draftPayload = {
        jobId: jobId || `draft-${crypto.randomUUID()}`,
        isImportDraft: true,
        metadata: {
          title: metadata.title || "Imported Course",
          description: metadata.description || "",
          category: metadata.category || "General",
          level: metadata.level || "BEGINNER",
          thumbnailUrl: thumbnailRef ? assetMap[thumbnailRef] || thumbnailRef : null,
          language: metadata.language || "English",
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          estimatedLearningHours: metadata.estimatedLearningHours || null,
          status: "DRAFT",
        },
        settings: {
          visibility: settings.visibility || "PUBLIC",
          certificatesEnabled: Boolean(settings.certificatesEnabled),
          discussionEnabled: settings.discussionEnabled !== false,
        },
        quizzes,
        modules,
        assetMap,
        canonicalJson: canonical,
      };

      sessionStorage.setItem("imported_course_draft", JSON.stringify(draftPayload));
      router.push("/instructor/courses/draft");
    } catch (err) {
      console.error("Draft Preparation Error:", err);
      setErrorMsg("Failed to prepare course draft for editing.");
    }
  };

  // ==========================================
  // 1. AI COURSE GENERATION HANDLER
  // ==========================================
  const handleGenerate = async () => {
    if (!prompt || !prompt.trim()) {
      setErrorMsg("Please describe what you want to teach in the prompt box.");
      return;
    }

    setWorkflowState("GENERATING");
    setErrorMsg("");
    setValidationErrors([]);
    setCurrentStepIndex(0);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < STAGED_STEPS.length - 1 ? prev + 1 : prev));
    }, 4500);

    try {
      const result = await generateAiMutation.mutateAsync({
        scope: "COURSE",
        prompt: prompt.trim(),
        context: {
          size,
          level,
          language,
          targetAudience: targetAudience || undefined,
        },
      });

      clearInterval(stepInterval);

      if (!result?.success) {
        const msg = result?.message || "AI course generation failed.";
        const errors = result?.errors || [msg];
        setErrorMsg(msg);
        setValidationErrors(errors);
        setWorkflowState("INPUT");
        return;
      }

      const resultData = result.data;
      if (resultData) {
        setGeneratedDraft(resultData);
        setWorkflowState("PREVIEW");
      } else {
        throw new Error("No course data returned from AI service.");
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error("AI Generation Error:", err);
      const status = err?.response?.status;
      let msg = err?.response?.data?.message || err?.message || "AI course generation failed. Please try again.";
      if (status === 429) {
        msg = "AI Usage limit reached. Please try again later.";
      }
      const errors = err?.response?.data?.errors || [msg];
      setErrorMsg(msg);
      setValidationErrors(errors);
      setWorkflowState("INPUT");
    }
  };

  const handleApplyToComposer = () => {
    if (!generatedDraft) return;
    const canonical = generatedDraft.canonicalJson || generatedDraft.data?.canonicalJson || generatedDraft;
    prepareDraftAndNavigate(canonical);
  };

  // ==========================================
  // 2. ZIP PACKAGE IMPORT HANDLER
  // ==========================================
  /** Stage 1 — take the package, show what was picked, and wait for confirmation. */
  const handleZipFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (zipInputRef.current) zipInputRef.current.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setErrorMsg("Invalid file type. Please select a .zip course package.");
      return;
    }

    setErrorMsg("");
    setValidationErrors([]);
    setZipError("");
    setZipErrors([]);
    setZipJobId(null);
    setZipFailedAt(null);
    setZipReadyJob(null);
    setZipCreatedCourseId(null);
    lastZipStageRef.current = "SELECTED";
    setZipFile(file);
    setZipStatus("SELECTED");
  };

  /** Clears the ZIP flow and returns to the three creation options. */
  const handleResetZipImport = () => {
    setZipFile(null);
    setZipStatus(null);
    setZipJobId(null);
    setZipFailedAt(null);
    setZipReadyJob(null);
    setZipCreatedCourseId(null);
    setZipError("");
    setZipErrors([]);
    lastZipStageRef.current = "SELECTED";
    if (zipInputRef.current) zipInputRef.current.value = "";
  };

  /**
   * Stages 2-6 — upload the package, then let the backend extract, check and
   * prepare it. Both requests are the existing ones; the poll running
   * alongside them is what surfaces the stages in between.
   */
  const handleStartZipImport = async () => {
    if (!zipFile) return;

    setZipError("");
    setZipErrors([]);
    setZipFailedAt(null);
    setZipStatus("UPLOADED");
    lastZipStageRef.current = "UPLOADED";

    let job = null;

    try {
      // Step 1: Upload ZIP file package to backend
      job = await uploadZipMutation.mutateAsync(zipFile);

      if (!job || !job.id) {
        throw new Error("Failed to create import job.");
      }

      setZipJobId(job.id);

      // Step 2: Extract, validate and map the package
      const processedJob = await processZipMutation.mutateAsync(job.id);

      if (processedJob?.status === "FAILED") {
        const failure = new Error(processedJob.errorMessage || "The package could not be processed.");
        failure.importErrors = processedJob?.validationReport?.errors;
        throw failure;
      }

      const canonical = processedJob?.canonicalJson || job?.canonicalJson;

      if (!canonical) {
        throw new Error("Unable to extract valid course structure from ZIP package.");
      }

      // Step 3: Hold at READY so the instructor sees what will be created
      setZipReadyJob({ ...processedJob, canonicalJson: canonical });
      advanceZipStatus("READY");
    } catch (err) {
      console.error("ZIP Import Error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to import the ZIP package. The package structure is invalid.";
      const errors = err?.response?.data?.errors || err?.importErrors || [];

      setZipFailedAt(lastZipStageRef.current);
      setZipError(msg);
      setZipErrors(errors);
      setZipStatus("FAILED");
    }
  };

  /** Stage 6 action — carry the validated structure into the Course Composer. */
  const handleContinueToComposer = () => {
    const canonical = zipReadyJob?.canonicalJson;
    if (!canonical || !zipJobId) return;
    prepareDraftAndNavigate(canonical, zipJobId);
  };

  /**
   * Stages 7-8 — write a validated physical package into the LMS. The package
   * already carries its full structure, so there is nothing to review first.
   */
  const handleCreateCourseFromPackage = async () => {
    if (!zipJobId) return;

    setZipStatus("IMPORTING");
    lastZipStageRef.current = "IMPORTING";

    try {
      const created = await importCourseJobMutation.mutateAsync(zipJobId);
      const courseId = created?.id || created?.courseId || null;

      setZipCreatedCourseId(courseId);
      advanceZipStatus("COMPLETED");

      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] });
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES_TABLE] });
    } catch (err) {
      console.error("Course Creation Error:", err);
      const msg =
        err?.response?.data?.message || err?.message || "The course could not be created.";
      setZipFailedAt("IMPORTING");
      setZipError(msg);
      setZipErrors(err?.response?.data?.errors || []);
      setZipStatus("FAILED");
    }
  };

  // ==========================================
  // 3. JSON FILE IMPORT HANDLER
  // ==========================================
  const handleJsonFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setErrorMsg("Invalid file type. Please select a .json file.");
      if (jsonInputRef.current) jsonInputRef.current.value = "";
      return;
    }

    setErrorMsg("");
    setValidationErrors([]);

    try {
      // Read & parse file locally first for instant syntax validation
      const text = await file.text();
      let parsedJson;
      try {
        parsedJson = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON syntax in file '${file.name}': ${parseErr.message}`);
      }

      // Basic Schema Checks — everything past this (which levels exist, what
      // each element needs) is validated by the backend, which reports it by path.
      if (!parsedJson || typeof parsedJson !== "object") {
        throw new Error("JSON file must contain a valid course object.");
      }

      // Process JSON with backend validator/parser
      const jobData = await processJsonMutation.mutateAsync({ file });
      const canonical = jobData?.canonicalJson || parsedJson;

      if (jsonInputRef.current) jsonInputRef.current.value = "";
      prepareDraftAndNavigate(canonical, jobData?.id);
    } catch (err) {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
      console.error("JSON File Import Error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to process JSON course file.";
      const errors = err?.response?.data?.errors || [msg];
      setErrorMsg(msg);
      setValidationErrors(errors);
    }
  };

  // ==========================================
  // 4. PASTE JSON HANDLER
  // ==========================================
  const handleValidateAndImportPastedJson = async () => {
    setPasteValidationErrors([]);
    setErrorMsg("");
    setValidationErrors([]);

    if (!pastedJsonText || !pastedJsonText.trim()) {
      setPasteValidationErrors(["Please paste course JSON text before validating."]);
      return;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(pastedJsonText.trim());
    } catch (parseErr) {
      setPasteValidationErrors([`Invalid JSON syntax: ${parseErr.message}`]);
      return;
    }

    if (!parsedJson || typeof parsedJson !== "object") {
      setPasteValidationErrors(["Root JSON element must be an object."]);
      return;
    }

    try {
      const jobData = await processJsonMutation.mutateAsync({ jsonContent: parsedJson });
      const canonical = jobData?.canonicalJson || parsedJson;

      setShowPasteModal(false);
      setPastedJsonText("");
      prepareDraftAndNavigate(canonical, jobData?.id);
    } catch (err) {
      console.error("Pasted JSON Import Error:", err);
      const msg = err?.response?.data?.message || err?.message || "JSON validation failed.";
      const errors = err?.response?.data?.errors || [msg];
      setPasteValidationErrors(errors);
    }
  };

  // ==========================================
  // 5. DOWNLOAD TEMPLATE HANDLER
  // ==========================================
  const handleDownloadTemplate = async () => {
    try {
      let templateData = FALLBACK_TEMPLATE;
      const { data: fetchedTemplate } = await refetchTemplate();
      if (fetchedTemplate) {
        templateData = fetchedTemplate;
      }

      const jsonStr = JSON.stringify(templateData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "orange_lms_course_template.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download Template Error:", err);
      setErrorMsg("Failed to download course template.");
    }
  };

  /**
   * Downloads the sample course package: the Course -> Modules -> Lessons ->
   * Topics hierarchy as real folders, with a real artifact file in each one.
   * Deliberately contains no course.json — the tree itself is the example.
   */
  const handleDownloadSampleZip = async () => {
    try {
      const zip = buildSampleCoursePackage(new JSZip());

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "sample_course_package.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download Sample ZIP Error:", err);
      setErrorMsg("Failed to download sample ZIP package.");
    }
  };

  // Preview Stats Calculation
  const canonicalData = generatedDraft?.canonicalJson || generatedDraft?.data?.canonicalJson || generatedDraft || {};
  const targetMetadata = canonicalData?.metadata || canonicalData || {};
  const modulesList = Array.isArray(canonicalData?.modules) ? canonicalData.modules : [];
  const quizzesList = Array.isArray(canonicalData?.quizzes) ? canonicalData.quizzes : [];

  // The backend's validation summary counts every level — quizzes, content and
  // assignments can sit on the course, a module, a lesson or a topic.
  const previewSummary = generatedDraft?.validationReport?.summary;
  const previewWarnings = generatedDraft?.validationReport?.warnings || [];

  const totalModulesCount = previewSummary?.modules ?? modulesList.length;
  const totalLessonsCount = previewSummary?.lessons ?? modulesList.reduce(
    (acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : 0),
    0
  );
  const totalQuizzesCount = previewSummary?.quizzes ??
    (modulesList.reduce((acc, m) => acc + (Array.isArray(m.quizzes) ? m.quizzes.length : 0), 0) +
      quizzesList.length);
  const previewExtras = previewSummary
    ? [
        [previewSummary.topics, "topic"],
        [previewSummary.contents, "content item"],
        [previewSummary.assignments, "assignment"],
      ]
        .filter(([count]) => count > 0)
        .map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`)
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 lg:p-10 font-sans pb-32">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={zipInputRef}
        onChange={handleZipFileSelected}
        accept=".zip"
        className="hidden"
      />
      <input
        type="file"
        ref={jsonInputRef}
        onChange={handleJsonFileSelected}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center space-x-3">
          <Link
            href="/instructor/courses"
            className="p-2 rounded-xl bg-background border border-transparent text-muted-foreground hover:text-foreground transition"
            aria-label="Back to courses"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="sr-only">
                Create & Import Course
              </h1>
            </div>
            <p className="sr-only">
              Build a new course with AI, import a local ZIP package, or load an Orange Tree LMS JSON course structure.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-sm space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {validationErrors.length > 0 && (
              <ul className="list-disc pl-6 text-xs space-y-1 text-rose-300/90 font-mono">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW A: THREE PRIMARY COURSE CREATION OPTIONS */}
        {/* ======================================================== */}
        {!showAiForm && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {zipStatus ? (
              /* A ZIP package is in flight: the chronological flow takes over
                 from the three options until it finishes or is dismissed. */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground">Import from ZIP</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {zipStatus === "SELECTED"
                        ? "Check the package below, then upload it to start the import."
                        : zipStatus === "READY"
                        ? "The package passed validation. Review what will be created, then continue."
                        : zipStatus === "IMPORTING"
                        ? "Creating the course in your LMS. This runs in one step, so it either completes or leaves nothing behind."
                        : zipStatus === "COMPLETED"
                        ? "The course was created and is ready to open."
                        : zipStatus === "FAILED"
                        ? "The import stopped, so nothing was added to your courses."
                        : "Keep this page open while the package is processed."}
                    </p>
                  </div>

                  {!isZipProcessing && zipStatus !== "IMPORTING" && (
                    <button
                      type="button"
                      onClick={handleResetZipImport}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{zipStatus === "SELECTED" ? "Cancel" : "Start over"}</span>
                    </button>
                  )}
                </div>

                <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-sky-500/25 shadow-2xl">
                  <ZipImportTimeline
                    status={zipStatus}
                    failedAt={zipFailedAt}
                    fileName={zipFile?.name}
                    fileSize={zipFile?.size}
                    summary={zipSummary}
                    errorMessage={zipError}
                    errors={zipErrors}
                  />

                  <div className="mt-6 pt-5 border-t border-muted-foreground/10">
                    {zipStatus === "SELECTED" && (
                      <button
                        type="button"
                        onClick={handleStartZipImport}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-foreground text-sm font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload package</span>
                      </button>
                    )}

                    {isZipProcessing && (
                      <p className="text-xs text-muted-foreground">
                        Large packages with media can take a few minutes.
                      </p>
                    )}

                    {zipStatus === "IMPORTING" && (
                      <p className="text-xs text-muted-foreground">
                        Writing modules, lessons, topics, quizzes and assignments.
                      </p>
                    )}

                    {zipStatus === "READY" && (
                      <button
                        type="button"
                        onClick={
                          isPhysicalZipPackage
                            ? handleCreateCourseFromPackage
                            : handleContinueToComposer
                        }
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-foreground text-sm font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {isPhysicalZipPackage ? "Create course" : "Review and create course"}
                        </span>
                      </button>
                    )}

                    {zipStatus === "COMPLETED" && (
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={
                            zipCreatedCourseId
                              ? `/instructor/courses/${zipCreatedCourseId}`
                              : "/instructor/courses"
                          }
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-foreground text-sm font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Open course</span>
                        </Link>
                      </div>
                    )}

                    {zipStatus === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => {
                          handleResetZipImport();
                          zipInputRef.current?.click();
                        }}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-foreground text-sm font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Choose another package</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
            <div className="text-left">
              <h2 className="text-xl font-extrabold text-foreground">How would you like to create your course?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Select one of the three creation entry points below to build or import your course.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ---------------------------------------------------- */}
              {/* OPTION 1: ASK OTREE AI */}
              {/* ---------------------------------------------------- */}
              <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-transparent shadow-2xl flex flex-col justify-between space-y-6 hover:border-primary/40 transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-primary/20 border border-primary/30 text-orange-300 rounded-full flex items-center space-x-1">
                      <Bot className="w-3 h-3" />
                      <span>AI Powered</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Ask OTree AI</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create a complete course using AI. Describe what you want to teach, who the learners are, and what the course should cover. OTree AI will generate a structured course draft for your review.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-background border border-transparent/80 text-xs font-mono text-orange-300 flex items-center space-x-1.5 flex-wrap">
                    <span className="font-bold text-amber-400">Complete Course</span>
                    <span className="text-[#777777]">→</span>
                    <span>Modules</span>
                    <span className="text-[#777777]">→</span>
                    <span>Lessons</span>
                    <span className="text-[#777777]">→</span>
                    <span className="text-emerald-400">Quizzes</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-transparent">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAiForm(true);
                      setWorkflowState("INPUT");
                    }}
                    className="w-full py-3.5 rounded-2xl bg-primary text-sm font-extrabold transition flex items-center justify-center space-x-2 cursor-pointer"
                    style={{ "--btn-rainbow-fill": "#7C3AED" }}
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Ask OTree AI</span>
                  </button>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* OPTION 2: IMPORT FROM ZIP */}
              {/* ---------------------------------------------------- */}
              <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-transparent shadow-2xl flex flex-col justify-between space-y-6 hover:border-sky-500/40 transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <FileArchive className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-full">
                      Package File
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Import from ZIP</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Import an existing course package with content and local media files. Supports exported Orange Tree LMS ZIP packages.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2.5 py-1 text-xs font-semibold bg-sky-950/60 border border-sky-800/60 text-sky-300 rounded-lg flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Includes content</span>
                    </span>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-sky-950/60 border border-sky-800/60 text-sky-300 rounded-lg flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>All media included</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-transparent">
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-foreground text-sm font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select ZIP Package</span>
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center font-mono">.zip file up to 2GB</p>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* OPTION 3: IMPORT FROM JSON */}
              {/* ---------------------------------------------------- */}
              <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-transparent shadow-2xl flex flex-col justify-between space-y-6 hover:border-indigo-500/40 transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full">
                      JSON Schema
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-foreground">Import from JSON</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create/import a course using the Orange Tree LMS JSON structure. Upload a file or paste raw JSON text directly.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-background border border-transparent text-xs font-mono text-indigo-300 flex items-center justify-center space-x-1.5 flex-wrap">
                    <span className="font-bold text-amber-400">Course</span>
                    <span className="text-[#777777]">→</span>
                    <span>Module</span>
                    <span className="text-[#777777]">→</span>
                    <span>Lesson</span>
                    <span className="text-[#777777]">→</span>
                    <span>Topic</span>
                    <span className="text-[#777777]">→</span>
                    <span className="text-emerald-400">Content</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-transparent">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => jsonInputRef.current?.click()}
                      className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-extrabold shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select JSON File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPasteValidationErrors([]);
                        setShowPasteModal(true);
                      }}
                      className="py-3 rounded-xl bg-muted hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste JSON</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowFormatGuideModal(true)}
                      className="text-muted-foreground hover:text-indigo-300 font-semibold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>View Format Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW B: AI COURSE CREATION FORM (ASK OTREE AI WORKFLOW) */}
        {/* ======================================================== */}
        {showAiForm && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Navigation Bar inside AI Form */}
            <div className="flex items-center justify-between pb-3 border-b border-transparent">
              <button
                type="button"
                onClick={() => {
                  setShowAiForm(false);
                  setWorkflowState("INPUT");
                }}
                className="px-4 py-2 rounded-xl bg-background border border-transparent hover:border-transparent text-foreground hover:text-foreground text-xs font-bold transition flex items-center space-x-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Creation Options</span>
              </button>

              <div className="flex items-center space-x-2 text-xs text-muted-foreground font-mono">
                <span>AI Course Creator</span>
                <span>•</span>
                <span className="text-primary font-bold">Complete Course Mode</span>
              </div>
            </div>

            {/* INPUT FORM STATE */}
            {workflowState === "INPUT" && (
              <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-transparent shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center space-x-2">
                        <span>Compose Course with AI Agent</span>
                        <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase bg-primary/20 border border-primary/30 text-orange-300 rounded-full flex items-center space-x-1">
                          <Bot className="w-3 h-3" />
                          <span>Gemini 3.6 Flash</span>
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Describe your course goals in plain text. The AI Agent builds only the structure you ask for — modules, lessons, topics, quizzes and assignments as needed. To match a specific format, paste a course JSON template into your prompt.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="e.g. Create a beginner Python course for college students. Cover variables, control flow, functions, OOP, and data structures with practical code examples and quizzes..."
                    rows={5}
                    className="w-full bg-background border border-transparent rounded-2xl p-4 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-orange-500/50 transition leading-relaxed resize-y font-sans shadow-inner"
                  />
                </div>

                {/* Example Prompt Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                    Try an example:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(ex.text);
                          if (errorMsg) setErrorMsg("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-background border border-transparent hover:border-primary/40 text-xs font-medium text-foreground hover:text-amber-400 transition cursor-pointer"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible Advanced Options Accordion */}
                <div className="pt-2 border-t border-transparent/80">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition py-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span>Customize Generation (Advanced options)</span>
                    {showAdvanced ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 p-4 rounded-2xl bg-background/80 border border-transparent/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Course Size</label>
                        <select
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className="w-full bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                        >
                          <option value="AUTO">Auto (Inferred)</option>
                          <option value="SMALL">Small (3-4 modules)</option>
                          <option value="MEDIUM">Medium (5-7 modules)</option>
                          <option value="LARGE">Large (8-10 modules)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Difficulty Level</label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="w-full bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                        >
                          <option value="AUTO">Auto (Inferred)</option>
                          <option value="BEGINNER">Beginner</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="ADVANCED">Advanced</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Target Audience</label>
                        <input
                          type="text"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="e.g. Beginners, Employees (Auto)"
                          className="w-full bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Language</label>
                        <input
                          type="text"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full bg-background border border-transparent rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer: ONLY Launch AI Composer button! */}
                <div className="flex items-center justify-between pt-4 border-t border-transparent">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Generates canonical course structure with modules & quizzes</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-sm font-extrabold shadow-lg shadow-orange-500/20 transition flex items-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Launch AI Composer</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI GENERATING STATE */}
            {workflowState === "GENERATING" && (
              <div className="p-8 md:p-12 rounded-3xl bg-background/90 border border-transparent shadow-2xl text-center space-y-8 animate-in fade-in duration-300">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-foreground">Creating your course with AI...</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Gemini 3.6 Flash is authoring your modules, lessons, topic materials, and quizzes.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-3 text-left">
                  {STAGED_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={step.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center space-x-3.5 ${
                          isDone
                            ? "bg-background/80 border-emerald-500/30 text-emerald-300"
                            : isCurrent
                            ? "bg-background border-primary/50 text-primary shadow-lg"
                            : "bg-background/40 border-transparent text-muted-foreground"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-5 h-5 text-primary animate-spin shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-transparent shrink-0" />
                        )}
                        <div>
                          <span className="text-xs font-bold block">{step.label}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">{step.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI PREVIEW STATE */}
            {workflowState === "PREVIEW" && (
              <div className="p-6 md:p-8 rounded-3xl bg-background/90 border border-transparent shadow-2xl space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-foreground">Course Draft Preview</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWorkflowState("INPUT")}
                    className="text-xs font-semibold text-primary hover:text-orange-300 transition underline"
                  >
                    Edit Prompt / Re-generate
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-background border border-transparent rounded-2xl text-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold block">Modules</span>
                    <span className="text-xl font-black text-amber-400 mt-1 block">{totalModulesCount}</span>
                  </div>
                  <div className="p-4 bg-background border border-transparent rounded-2xl text-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold block">Lessons</span>
                    <span className="text-xl font-black text-primary mt-1 block">{totalLessonsCount}</span>
                  </div>
                  <div className="p-4 bg-background border border-transparent rounded-2xl text-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold block">Quizzes</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">{totalQuizzesCount}</span>
                  </div>
                </div>

                <div className="p-5 bg-background border border-transparent rounded-2xl max-h-[50vh] overflow-y-auto space-y-4">
                  <div>
                    <h4 className="text-base font-extrabold text-amber-400">
                      {targetMetadata?.title || "AI Generated Course"}
                    </h4>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      {targetMetadata?.description || "Course description generated by AI."}
                    </p>
                    <div className="flex items-center space-x-3 text-[11px] font-mono text-muted-foreground mt-2">
                      <span>Level: {targetMetadata?.level || "BEGINNER"}</span>
                      <span>•</span>
                      <span>Category: {targetMetadata?.category || "General"}</span>
                    </div>
                    {previewExtras.length > 0 && (
                      <p className="text-[11px] font-mono text-sky-400 mt-1">
                        Also includes {previewExtras.join(" · ")}
                      </p>
                    )}
                  </div>

                  {previewWarnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Review before creating the course</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-foreground/80">
                        {previewWarnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {modulesList.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-transparent">
                      {modulesList.map((m, idx) => (
                        <div key={idx} className="p-4 bg-background border border-transparent rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span className="flex items-center space-x-2">
                              <Layers className="w-4 h-4 text-amber-400" />
                              <span>Module {idx + 1}: {m.title}</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {Array.isArray(m.lessons) ? `${m.lessons.length} lessons` : "0 lessons"}
                            </span>
                          </div>
                          {m.description && <p className="text-xs text-muted-foreground leading-relaxed pl-6">{m.description}</p>}

                          {Array.isArray(m.lessons) && m.lessons.length > 0 && (
                            <div className="pl-6 border-l border-transparent space-y-1.5 mt-2">
                              {m.lessons.map((l, lIdx) => (
                                <div key={lIdx} className="text-xs text-foreground flex items-center justify-between">
                                  <span className="flex items-center space-x-2">
                                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                                    <span>• {l.title}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-transparent">
                  <button
                    type="button"
                    onClick={() => setWorkflowState("INPUT")}
                    className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-xs font-semibold border border-transparent transition"
                  >
                    Back to Prompt
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToComposer}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                    <span>Apply to Course Composer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PASTE JSON MODAL */}
      {/* ======================================================== */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-transparent rounded-3xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-transparent pb-4">
              <div className="flex items-center space-x-2">
                <Clipboard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-foreground">Paste Orange Tree LMS JSON</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pasteValidationErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5 text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Validation Error</span>
                </div>
                <ul className="list-disc pl-5 font-mono text-[11px] space-y-0.5 text-rose-300/90">
                  {pasteValidationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Paste JSON Course Content below:
              </label>
              <textarea
                value={pastedJsonText}
                onChange={(e) => setPastedJsonText(e.target.value)}
                placeholder='{\n  "course": {\n    "title": "My Custom Course",\n    "category": "Computer Science"\n  },\n  "content": [...],\n  "modules": [...]\n}'
                rows={10}
                className="w-full bg-background border border-transparent rounded-2xl p-4 text-xs text-foreground font-mono focus:outline-none focus:border-indigo-500 transition resize-y"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-transparent">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleValidateAndImportPastedJson}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-extrabold transition flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Validate & Import JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FORMAT GUIDE MODAL */}
      {/* ======================================================== */}
      {showFormatGuideModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-transparent rounded-3xl w-full max-w-3xl p-6 md:p-8 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-transparent pb-4">
              <div className="flex items-center space-x-2">
                <FileJson className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-foreground">Orange Tree LMS Course JSON Format Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormatGuideModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hierarchy Explanation */}
            <div className="space-y-4 text-xs text-foreground leading-relaxed">
              <div className="p-4 rounded-2xl bg-indigo-950/40 space-y-2">
                <h4 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px]">
                  Flexible Course Structure
                </h4>
                <p className="text-foreground">
                  The template shows <strong>how</strong> course JSON is written, not <strong>what</strong> every course must contain. Every level and element below is optional — include only what your course needs.
                </p>
                <div className="p-2.5 bg-background rounded-xl font-mono text-[11px] text-amber-300 flex items-center space-x-2 flex-wrap">
                  <span className="font-bold">Course</span> → <span>Module</span> → <span>Lesson</span> → <span>Topic</span>
                </div>
                <p className="text-muted-foreground">
                  Each of these four levels can carry its own <span className="font-mono text-sky-400">content</span>, <span className="font-mono text-purple-400">quiz</span> and <span className="font-mono text-rose-400">assignment</span>. A module can have content without lessons, a lesson can have content without topics, and modules in one course can be structured differently.
                </p>
              </div>

              {/* Schema Fields Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-sm">Fields</h4>

                <div className="space-y-2">
                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-amber-400 font-mono block">course</span>
                    <span className="text-muted-foreground block mt-0.5">
                      title (required), description, category, level, thumbnailUrl, visibility (PUBLIC | PRIVATE | UNLISTED), language, tags, certificatesEnabled, discussionEnabled, estimatedLearningHours. Imported courses are always created as DRAFT.
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-emerald-400 font-mono block">modules [ ] → lessons [ ] → topics [ ]</span>
                    <span className="text-muted-foreground block mt-0.5">
                      Each has title (required), description and isPublished. There is no order field: items appear in the order you list them, and a level&apos;s quiz comes after its content and children.
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-sky-400 font-mono block">content [ ]</span>
                    <span className="text-muted-foreground block mt-0.5">
                      On any level. Each item has type (HTML, VIDEO, DOCUMENT, PRESENTATION, CODE, LINK, IMAGE, AUDIO…), title, and htmlContent, videoUrl, fileUrl or externalUrl as the type needs.
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-purple-400 font-mono block">quiz</span>
                    <span className="text-muted-foreground block mt-0.5">
                      On any level: title, quizTag (SELF_TEST, LESSON_ASSESSMENT, MODULE_ASSESSMENT, COURSE_ASSESSMENT), passingScore and questions. MCQ questions need options and a correctAnswer that matches one of them.
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-rose-400 font-mono block">assignment</span>
                    <span className="text-muted-foreground block mt-0.5">
                      On any level: title, description, dueDate (required by the LMS, ISO 8601), marks, assessmentType and estimatedTime in minutes.
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-xl">
                    <span className="font-bold text-foreground font-mono block">courseId · moduleId · lessonId · topicId</span>
                    <span className="text-muted-foreground block mt-0.5">
                      Optional references, as in the template (a lesson&apos;s moduleId names its module). When given, they must agree with where the item is nested.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-transparent">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFormatGuideModal(false)}
                className="px-6 py-2 rounded-xl bg-muted hover:bg-slate-750 text-foreground text-xs font-bold transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Ask OTree AI Assistant Modal (Workflow 2: Specific Entity Creation) */}
      <AiComposerModal
        isOpen={isAskAiModalOpen}
        onClose={() => setIsAskAiModalOpen(false)}
        initialScope="MODULE"
        contextData={{
          courseTitle: prompt ? prompt.slice(0, 40) + "..." : "New Course",
          modules: generatedDraft?.modules || [],
          courseQuizzes: generatedDraft?.quizzes || [],
          activeLevel: "COURSE",
        }}
        onApply={(generatedData, scope, contextData) => {
          if (scope === "COURSE") {
            const canonical = generatedData.canonicalJson || generatedData;
            prepareDraftAndNavigate(canonical);
          } else {
            const newModule = scope === "MODULE" ? generatedData : {
              title: generatedData.title || "Module 1",
              description: "",
              order: 1,
              lessons: scope === "LESSON" ? [generatedData] : [
                {
                  title: generatedData.title || "Lesson 1",
                  description: "",
                  order: 1,
                  topics: scope === "TOPIC" ? [generatedData] : [
                    {
                      title: generatedData.title || "Topic 1",
                      description: "",
                      order: 1,
                      contents: scope === "CONTENT" ? (Array.isArray(generatedData.contents) ? generatedData.contents : [generatedData]) : []
                    }
                  ]
                }
              ]
            };

            const canonical = {
              metadata: {
                title: generatedData.title || "AI Created Course",
                description: "Created via Ask OTree AI",
                category: "General",
                level: "BEGINNER",
              },
              settings: { visibility: "PUBLIC" },
              modules: [newModule],
              quizzes: scope === "QUIZ" ? [generatedData] : [],
            };
            prepareDraftAndNavigate(canonical);
          }
        }}
      />
    </div>
  );
}
