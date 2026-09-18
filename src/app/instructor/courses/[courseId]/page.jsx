"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import {
  PanelLeftOpen,
} from "lucide-react";

import Loader from "@/components/common/Loader";
import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import { useModules } from "@/hooks/queries/instructor/useModules";
import { useUpdateCourse } from "@/hooks/queries/instructor/useUpdateCourse";
import { useUpdateLesson } from "@/hooks/queries/instructor/useUpdateLesson";
import { useDeleteModule } from "@/hooks/queries/instructor/useDeleteModule";
import { useDeleteCourse } from "@/hooks/queries/instructor/useDeleteCourse";
import { usePublishCourse } from "@/hooks/queries/instructor/usePublishCourse";
import { useUnpublishCourse } from "@/hooks/queries/instructor/useUnpublishCourse";
import { useArchiveCourse } from "@/hooks/queries/instructor/useArchiveCourse";
import { useRestoreCourse } from "@/hooks/queries/instructor/useRestoreCourse";
import { useDeleteLesson } from "@/hooks/queries/instructor/useDeleteLesson";
import { useDeleteTopic } from "@/hooks/queries/instructor/useDeleteTopic";
import { useDeleteSubTopic } from "@/hooks/queries/instructor/useDeleteSubTopic";
import { useDeleteConcept } from "@/hooks/queries/instructor/useDeleteConcept";
import { useSubTopic } from "@/hooks/queries/instructor/useSubTopic";
import { useConcept } from "@/hooks/queries/instructor/useConcept";
import { useDeleteContent } from "@/hooks/queries/instructor/useDeleteContent";
import useTrackCourseView from "@/hooks/queries/instructor/useTrackCourseView";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useToast } from "@/components/ui/ToastProvider";
import { LessonComposerPanel } from "@/components/instructor/LessonComposer/LessonComposerPanel";
import { duplicateCourse } from "@/services/course.service";
import { createQuiz as createQuizService, updateQuiz as updateQuizService, deleteQuiz as deleteQuizService, getQuizById as getQuizByIdService } from "@/services/quiz.service";
import {
  bulkCreateQuestions as bulkCreateQuestionsService,
  updateRepositoryQuestion,
  removeQuestionFromQuiz as removeQuestionFromQuizService,
  importQuestionsToQuiz as importQuestionsToQuizService,
} from "@/services/questionRepository.service";

import { CourseComposerHeader } from "@/components/instructor/courses/CourseComposerHeader";
import { CourseComposerSidebar } from "@/components/instructor/courses/CourseComposerSidebar";
import { CourseOverviewView } from "@/components/instructor/courses/CourseOverviewView";
import { ModuleOverviewView } from "@/components/instructor/courses/ModuleOverviewView";
import { LessonOverviewView } from "@/components/instructor/courses/LessonOverviewView";
import { QuizOverviewView } from "@/components/instructor/courses/QuizOverviewView";
import { AssignmentOverviewView } from "@/components/instructor/courses/AssignmentOverviewView";
import { EntityFormModal } from "@/components/instructor/courses/EntityFormModal";
import { AssignmentFormModal } from "@/components/instructor/courses/AssignmentFormModal";
import { useUpdateAssignment, useDeleteAssignment } from "@/hooks/queries/instructor/useAssignments";
import { UnpublishModal } from "@/components/instructor/courses/UnpublishModal";
import { DeleteCourseModal } from "@/components/instructor/courses/DeleteCourseModal";
import AiComposerModal from "@/components/instructor/composer/AiComposerModal";

/** Finds a lesson and its parent module by lessonId across all modules */
function findModuleAndLessonById(modules, lessonId) {
  if (!modules || !lessonId) return { module: null, lesson: null };
  for (const mod of modules) {
    const found = (mod.lessons || []).find((l) => String(l.id || l._id) === String(lessonId));
    if (found) return { module: mod, lesson: found };
  }
  return { module: null, lesson: null };
}

function findHierarchyByTopicId(modules, topicId) {
  if (!modules || !topicId) return { module: null, lesson: null, topic: null };
  for (const mod of modules) {
    for (const les of mod.lessons || []) {
      const foundTopic = (les.topics || []).find((t) => String(t.id || t._id) === String(topicId));
      if (foundTopic) {
        return { module: mod, lesson: les, topic: foundTopic };
      }
    }
  }
  return { module: null, lesson: null, topic: null };
}

/** Immutably replaces the module in `modules` matching moduleId, via `updateModule`. */
function withModule(modules, moduleId, updateModule) {
  return modules.map((mod) =>
    String(mod.id || mod._id) === String(moduleId) ? updateModule(mod) : mod
  );
}

/** Immutably replaces the lesson within `mod.lessons` matching lessonId, via `updateLesson`. */
function withLessonIn(mod, lessonId, updateLesson) {
  return {
    ...mod,
    lessons: (mod.lessons || []).map((les) =>
      String(les.id || les._id) === String(lessonId) ? updateLesson(les) : les
    ),
  };
}

/** Immutably replaces the topic within `les.topics` matching topicId, via `updateTopic`. */
function withTopicIn(les, topicId, updateTopic) {
  return {
    ...les,
    topics: (les.topics || []).map((top) =>
      String(top.id || top._id) === String(topicId) ? updateTopic(top) : top
    ),
  };
}

/** Content and assignments can sit on any level of an import draft; each needs an ID to be keyed and selected in the course map. */
function withDraftItemIds(items, prefix) {
  return (items || []).map((item, idx) => ({ ...item, id: item.id || `${prefix}-${idx + 1}` }));
}

// The workspace selections the URL is allowed to restore. Anything else in
// `?view=` is ignored and the page opens on the course overview, so a
// hand-edited or stale link can't drop the composer into an unknown mode.
const COMPOSER_MODES = new Set(["course", "module", "lesson", "topic", "subTopic", "concept", "quiz"]);

/** The workspace view for a selection's deepest selected level (used when leaving a quiz/assignment view). */
function composerModeForSelection({ conceptId, subTopicId, topicId, lessonId, moduleId }) {
  if (conceptId) return "concept";
  if (subTopicId) return "subTopic";
  if (topicId) return "topic";
  if (lessonId) return "lesson";
  if (moduleId) return "module";
  return "course";
}

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId;
  const { showToast } = useToast();

  // React Query Hooks
  // This page renders the syllabus from useModules() below — `course.modules`
  // was fetched and never read, meaning the entire tree (every content cell
  // body, every quiz question and answer key) was transferred and discarded on
  // every visit. Only course metadata and course-level `quizzes` are used here,
  // and course-level quizzes are outside the omitted `modules` relation.
  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
  } = useInstructorCourse(courseId, { shallow: true });

  const {
    data: modules = [],
    isLoading: modulesLoading,
  } = useModules(courseId);

  const deleteModuleMutation = useDeleteModule();
  const deleteCourseMutation = useDeleteCourse();
  const publishCourseMutation = usePublishCourse();
  const unpublishCourseMutation = useUnpublishCourse();
  const archiveCourseMutation = useArchiveCourse();
  const restoreCourseMutation = useRestoreCourse();
  const deleteLessonMutation = useDeleteLesson();
  const deleteTopicMutation = useDeleteTopic();
  const deleteSubTopicMutation = useDeleteSubTopic();
  const deleteConceptMutation = useDeleteConcept();
  const deleteContentMutation = useDeleteContent();
  const updateCourseMutation = useUpdateCourse();
  const updateLessonMutation = useUpdateLesson();
  const queryClient = useQueryClient();

  // Global View Mode: 'rendered' | 'edit'

  // Active Workspace Selection: 'course' | 'lesson' | 'module' | 'topic' | 'quiz'
  //
  // Seeded from the query string so a refresh (or a pasted link) reopens the
  // exact module → lesson → topic → content the instructor was looking at.
  // The effect further down writes these back to the URL as the selection
  // changes; `?compose=` is the older lesson-only form of `?lesson=`, still
  // honoured so existing links keep working.
  const initialView = searchParams.get("view");
  const [composerMode, setComposerMode] = useState(
    COMPOSER_MODES.has(initialView) ? initialView : "course"
  );
  // Deliberately always "view" on load: a refresh in the middle of creating or
  // editing a quiz has already lost the unsaved question edits, so reopening
  // that form empty would be a lie. The saved quiz is shown instead.
  const [quizMode, setQuizMode] = useState("view"); // "view" | "edit" | "create"
  const [composeLessonId, setComposeLessonId] = useState(
    searchParams.get("lesson") || searchParams.get("compose") || null
  );
  const [composeModuleId, setComposeModuleId] = useState(searchParams.get("module") || null);
  const [composeTopicId, setComposeTopicId] = useState(searchParams.get("topic") || null);
  // SubTopic/Concept aren't in the modules tree (GET /modules stops at Topic),
  // so the selected ones are loaded by id further down (useSubTopic/useConcept).
  const [composeSubTopicId, setComposeSubTopicId] = useState(searchParams.get("subTopic") || null);
  const [composeConceptId, setComposeConceptId] = useState(searchParams.get("concept") || null);
  // Titles of SubTopics/Concepts picked in the Course Map, known the moment
  // they're clicked — the by-id fetch can still be in flight, and a title
  // that only appears later would re-run QuizOverviewView's create-mode reset.
  const [knownNodeTitles, setKnownNodeTitles] = useState({});
  const rememberNodeTitle = (node) => {
    if (node?.id && node.title) setKnownNodeTitles((prev) => (prev[node.id] === node.title ? prev : { ...prev, [node.id]: node.title }));
  };
  const [composeQuizId, setComposeQuizId] = useState(searchParams.get("quiz") || null);
  const [composeAssignmentId, setComposeAssignmentId] = useState(null);
  // The row that was clicked (or just created), used until the refetched tree
  // carries it — the same fallback selectedQuizState gives a new quiz.
  const [selectedAssignmentState, setSelectedAssignmentState] = useState(null);
  const [assignmentStartEditing, setAssignmentStartEditing] = useState(false);
  const [selectedQuizState, setSelectedQuizState] = useState(null);
  const [quizStartEditing, setQuizStartEditing] = useState(false);
  const [pendingQuizOrder, setPendingQuizOrder] = useState(null);
  const updateAssignmentMutation = useUpdateAssignment();
  const deleteAssignmentMutation = useDeleteAssignment();
  const [selectedCellId, setSelectedCellId] = useState(searchParams.get("content") || null);

  // Edit Mode for Metadata Headers
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);

  // Editable Form States
  const [courseForm, setCourseForm] = useState({});
  const [lessonForm, setLessonForm] = useState({});

  // Module/Lesson/Topic modal
  // Create-an-Assignment dialog (saved courses only — a draft's assignments
  // come from the import file, and there is nothing to POST them to yet).
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [entityModalState, setEntityModalState] = useState(null);
  const openEntityModal = (config) => setEntityModalState(config);
  const closeEntityModal = () => setEntityModalState(null);

  // Ask OTree AI State & Handlers
  const [askAiModalOpen, setAskAiModalOpen] = useState(false);
  const [askAiScope, setAskAiScope] = useState("COURSE");
  const [askAiContext, setAskAiContext] = useState({});

  const handleOpenAskAi = (overrideScope = null) => {
    const currentCourse = effectiveCourse;

    const currentModule = composeModuleId
      ? effectiveModules.find((m) => String(m.id || m._id) === String(composeModuleId))
      : null;

    let currentLesson = null;
    if (currentModule && composeLessonId) {
      currentLesson = (currentModule.lessons || []).find((l) => String(l.id || l._id) === String(composeLessonId));
    } else if (composeLessonId) {
      for (const mod of effectiveModules) {
        const found = (mod.lessons || []).find((l) => String(l.id || l._id) === String(composeLessonId));
        if (found) {
          currentLesson = found;
          break;
        }
      }
    }

    let currentTopic = null;
    if (currentLesson && composeTopicId) {
      currentTopic = (currentLesson.topics || []).find((t) => String(t.id || t._id) === String(composeTopicId));
    } else if (composeTopicId) {
      for (const mod of effectiveModules) {
        for (const les of mod.lessons || []) {
          const found = (les.topics || []).find((t) => String(t.id || t._id) === String(composeTopicId));
          if (found) {
            currentTopic = found;
            break;
          }
        }
        if (currentTopic) break;
      }
    }

    let currentContent = null;
    if (currentTopic && selectedCellId) {
      currentContent = (currentTopic.contents || []).find((c) => String(c.id || c._id) === String(selectedCellId));
    }

    const activeLevel = currentContent
      ? "CONTENT"
      : currentTopic
      ? "TOPIC"
      : currentLesson
      ? "LESSON"
      : currentModule
      ? "MODULE"
      : "COURSE";

    const ctx = {
      courseId,
      courseTitle: currentCourse?.title || "",
      moduleId: currentModule?.id || currentModule?._id || null,
      moduleTitle: currentModule?.title || "",
      lessonId: currentLesson?.id || currentLesson?._id || null,
      lessonTitle: currentLesson?.title || "",
      topicId: currentTopic?.id || currentTopic?._id || null,
      topicTitle: currentTopic?.title || "",
      contentId: currentContent?.id || currentContent?._id || null,
      activeLevel,
      modules: effectiveModules || [],
      courseQuizzes: effectiveCourse?.quizzes || [],
    };

    const initialScope =
      overrideScope ||
      (activeLevel === "CONTENT"
        ? "CONTENT"
        : activeLevel === "TOPIC"
        ? "TOPIC"
        : activeLevel === "LESSON"
        ? "TOPIC"
        : activeLevel === "MODULE"
        ? "LESSON"
        : "MODULE");

    setAskAiScope(initialScope);
    setAskAiContext(ctx);
    setAskAiModalOpen(true);
  };

  const handleApplyAiGeneratedData = async (generatedData, scope, contextData) => {
    try {
      const pos = contextData?.position || "END";

      const insertByPos = (arr = [], newItem) => {
        let resArr = [];
        if (!pos || pos === "END" || pos === "AUTO_END") {
          resArr = [...arr, newItem];
        } else if (pos === "BEGINNING") {
          resArr = [newItem, ...arr];
        } else if (pos.startsWith("AFTER_")) {
          const afterId = pos.replace("AFTER_", "");
          const idx = arr.findIndex((item) => String(item.id || item._id) === String(afterId));
          if (idx !== -1) {
            resArr = [...arr];
            resArr.splice(idx + 1, 0, newItem);
          } else {
            resArr = [...arr, newItem];
          }
        } else {
          resArr = [...arr, newItem];
        }
        return resArr.map((item, i) => ({ ...item, order: i + 1 }));
      };

      if (!isDraftMode) {
        // Transactional Backend Application (Requirement: Atomicity & Single Operation)
        const targetModuleId = contextData.moduleId || composeModuleId;
        const targetLessonId = contextData.lessonId || composeLessonId;
        const targetTopicId = contextData.topicId || composeTopicId;
        const quizLevel = contextData.quizLevel || "COURSE";

        const { data: applyResponse } = await api.post("/api/ai/apply", {
          scope,
          generatedData,
          context: {
            courseId,
            moduleId: targetModuleId,
            lessonId: targetLessonId,
            topicId: targetTopicId,
            position: pos,
            quizLevel,
          },
        });

        // The apply response IS the created entity (Module/Lesson/Topic/
        // Content[]/Quiz row) — enough to splice straight into the Course
        // Map cache immediately instead of waiting on the invalidation below
        // to round-trip. Its own nested children (a fresh module's lessons,
        // a fresh quiz's questions, ...) arrive shortly after via that same
        // (now-parallelized) refetch, since the apply response doesn't
        // include them (see courseImporter.service.js — each nested row is
        // its own separate tx.create()).
        const createdEntity = applyResponse?.data;
        const patchModules = (updater) =>
          queryClient.setQueryData([QUERY_KEYS.MODULES, courseId], (old) =>
            Array.isArray(old) ? updater(old) : old
          );

        if (scope === "MODULE" && createdEntity?.id) {
          patchModules((mods) => [...mods, { ...createdEntity, lessons: [], quizzes: [] }]);
        } else if (scope === "LESSON" && createdEntity?.id && targetModuleId) {
          patchModules((mods) =>
            withModule(mods, targetModuleId, (mod) =>
              ({ ...mod, lessons: [...(mod.lessons || []), { ...createdEntity, topics: [], quizzes: [] }] })
            )
          );
        } else if (scope === "TOPIC" && createdEntity?.id && targetModuleId && targetLessonId) {
          patchModules((mods) =>
            withModule(mods, targetModuleId, (mod) =>
              withLessonIn(mod, targetLessonId, (les) =>
                ({ ...les, topics: [...(les.topics || []), { ...createdEntity, contents: [] }] })
              )
            )
          );
        } else if (scope === "CONTENT" && targetTopicId) {
          const createdContents = Array.isArray(createdEntity) ? createdEntity : createdEntity ? [createdEntity] : [];
          if (createdContents.length > 0 && targetModuleId && targetLessonId) {
            patchModules((mods) =>
              withModule(mods, targetModuleId, (mod) =>
                withLessonIn(mod, targetLessonId, (les) =>
                  withTopicIn(les, targetTopicId, (top) =>
                    ({ ...top, contents: [...(top.contents || []), ...createdContents] })
                  )
                )
              )
            );
            queryClient.setQueryData([QUERY_KEYS.CONTENTS, targetTopicId], (old) =>
              Array.isArray(old) ? [...old, ...createdContents] : old
            );
          }
        } else if (scope === "QUIZ" && createdEntity?.id) {
          // course.quizzes (QUERY_KEYS.COURSE) is the source of truth
          // effectiveModules falls back to for every quiz level — getModules()
          // never includes a quizzes relation on Module/Lesson/Topic, so
          // patching mod/lesson/topic.quizzes on the MODULES cache always
          // started from an empty array and replaced the visible list
          // instead of joining it. Appending here, regardless of level,
          // fixes all four (Course/Module/Lesson/Topic) the same way.
          const newQuiz = { ...createdEntity, questions: [] };
          queryClient.setQueryData([QUERY_KEYS.COURSE, courseId], (old) =>
            old ? { ...old, quizzes: [...(old.quizzes || []), newQuiz] } : old
          );
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE, courseId] }),
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MODULES, courseId] }),
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] }),
          ...(contextData.topicId || composeTopicId
            ? [
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONTENTS, contextData.topicId || composeTopicId] }),
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOPIC, contextData.topicId || composeTopicId] }),
              ]
            : []),
        ]);
        showToast(`${scope} created from AI!`, "success");
        return;
      }

      if (scope === "MODULE") {
        const newModId = `draft-mod-${Date.now()}`;
        const title = generatedData.title || "AI Generated Module";
        const description = generatedData.description || "";

        const newMod = {
          id: newModId,
          title,
          description,
          order: 1,
          quizzes: (generatedData.quizzes || []).map((qz, qIdx) => ({
            id: `draft-qz-${newModId}-${qIdx + 1}`,
            title: qz.title || `Module Quiz ${qIdx + 1}`,
            description: qz.description || "",
            questions: (qz.questions || []).map((q, qIdx2) => ({
              id: `draft-quest-${newModId}-${qIdx + 1}-${qIdx2 + 1}`,
              question: q.question || `Question ${qIdx2 + 1}`,
              questionType: q.questionType || "MCQ_SINGLE",
              options: q.options || [],
              correctAnswer: q.correctAnswer || "",
            })),
          })),
          lessons: (generatedData.lessons || []).map((l, lIdx) => ({
            id: `draft-les-${newModId}-${lIdx + 1}`,
            title: l.title || `Lesson ${lIdx + 1}`,
            description: l.description || "",
            order: lIdx + 1,
            quizzes: (l.quizzes || []).map((qz, qIdx) => ({
              id: `draft-qz-${newModId}-${lIdx + 1}-${qIdx + 1}`,
              title: qz.title || `Lesson Quiz ${qIdx + 1}`,
              description: qz.description || "",
              questions: (qz.questions || []).map((q, qIdx2) => ({
                id: `draft-quest-${newModId}-${lIdx + 1}-${qIdx + 1}-${qIdx2 + 1}`,
                question: q.question || `Question ${qIdx2 + 1}`,
                questionType: q.questionType || "MCQ_SINGLE",
                options: q.options || [],
                correctAnswer: q.correctAnswer || "",
              })),
            })),
            topics: (l.topics || []).map((t, tIdx) => ({
              id: `draft-top-${newModId}-${lIdx + 1}-${tIdx + 1}`,
              title: t.title || `Topic ${tIdx + 1}`,
              description: t.description || "",
              order: tIdx + 1,
              quiz: t.quiz ? {
                id: `draft-qz-${newModId}-${lIdx + 1}-${tIdx + 1}`,
                title: t.quiz.title || "Topic Quiz",
                questions: (t.quiz.questions || []).map((q, qIdx2) => ({
                  id: `draft-quest-${newModId}-${lIdx + 1}-${tIdx + 1}-${qIdx2 + 1}`,
                  question: q.question || `Question ${qIdx2 + 1}`,
                  questionType: q.questionType || "MCQ_SINGLE",
                  options: q.options || [],
                  correctAnswer: q.correctAnswer || "",
                })),
              } : null,
              contents: (t.contents || []).map((c, cIdx) => ({
                id: `draft-cnt-${newModId}-${lIdx + 1}-${tIdx + 1}-${cIdx + 1}`,
                type: c.type || "HTML",
                title: c.title || "Content Block",
                htmlContent: c.htmlContent || c.code || c.body || c.content || "",
                order: cIdx + 1,
              })),
            })),
          })),
        };
        const nextMods = insertByPos(draftModules, newMod);
        setDraftModules(nextMods);
        handleSelectModule(newMod);
        showToast("Module created from AI!", "success");
      } else if (scope === "LESSON") {
        const targetModuleId = contextData.moduleId || composeModuleId || effectiveModules[0]?.id;
        const title = generatedData.title || "AI Generated Lesson";
        const description = generatedData.description || "";

        let createdLessonObj = null;
        const nextMods = draftModules.map((m) => {
          if (String(m.id || m._id) === String(targetModuleId)) {
            const lesOrder = ((m.lessons || []).length > 0 ? Math.max(...m.lessons.map((l) => l.order || 0)) : 0) + 1;
            createdLessonObj = {
              id: `draft-les-${Date.now()}`,
              title,
              description,
              order: lesOrder,
              quizzes: (generatedData.quizzes || []).map((qz, qIdx) => ({
                id: `draft-qz-${Date.now()}-${qIdx + 1}`,
                title: qz.title || `Lesson Quiz ${qIdx + 1}`,
                description: qz.description || "",
                questions: (qz.questions || []).map((q, qIdx2) => ({
                  id: `draft-quest-${Date.now()}-${qIdx + 1}-${qIdx2 + 1}`,
                  question: q.question || `Question ${qIdx2 + 1}`,
                  questionType: q.questionType || "MCQ_SINGLE",
                  options: q.options || [],
                  correctAnswer: q.correctAnswer || "",
                })),
              })),
              topics: (generatedData.topics || []).map((t, tIdx) => ({
                id: `draft-top-${Date.now()}-${tIdx + 1}`,
                title: t.title || `Topic ${tIdx + 1}`,
                description: t.description || "",
                order: tIdx + 1,
                quiz: t.quiz ? {
                  id: `draft-qz-${Date.now()}-${tIdx + 1}`,
                  title: t.quiz.title || "Topic Quiz",
                  questions: (t.quiz.questions || []).map((q, qIdx2) => ({
                    id: `draft-quest-${Date.now()}-${tIdx + 1}-${qIdx2 + 1}`,
                    question: q.question || `Question ${qIdx2 + 1}`,
                    questionType: q.questionType || "MCQ_SINGLE",
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || "",
                  })),
                } : null,
                contents: (t.contents || []).map((c, cIdx) => ({
                  id: `draft-cnt-${Date.now()}-${tIdx + 1}-${cIdx + 1}`,
                  type: c.type || "HTML",
                  title: c.title || "Content Block",
                  htmlContent: c.htmlContent || c.code || c.body || c.content || "",
                  order: cIdx + 1,
                })),
              })),
            };
            return { ...m, lessons: insertByPos(m.lessons || [], createdLessonObj) };
          }
          return m;
        });
        setDraftModules(nextMods);
        if (createdLessonObj) {
          handleSelectLesson(createdLessonObj.id, targetModuleId);
        }
        showToast("Lesson created from AI!", "success");
      } else if (scope === "TOPIC") {
        const targetLessonId = contextData.lessonId || composeLessonId;
        const targetModuleId = contextData.moduleId || composeModuleId;
        const title = generatedData.title || "AI Generated Topic";
        const description = generatedData.description || "";

        let createdTopicObj = null;
        const nextMods = draftModules.map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((l) => {
            if (String(l.id || l._id) === String(targetLessonId)) {
              const topOrder = ((l.topics || []).length > 0 ? Math.max(...l.topics.map((t) => t.order || 0)) : 0) + 1;
              createdTopicObj = {
                id: `draft-top-${Date.now()}`,
                title,
                description,
                order: topOrder,
                quiz: generatedData.quiz ? {
                  id: `draft-qz-${Date.now()}`,
                  title: generatedData.quiz.title || "Topic Quiz",
                  questions: (generatedData.quiz.questions || []).map((q, qIdx2) => ({
                    id: `draft-quest-${Date.now()}-${qIdx2 + 1}`,
                    question: q.question || `Question ${qIdx2 + 1}`,
                    questionType: q.questionType || "MCQ_SINGLE",
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || "",
                  })),
                } : null,
                contents: (generatedData.contents || []).map((c, cIdx) => ({
                  id: `draft-cnt-${Date.now()}-${cIdx + 1}`,
                  type: c.type || "HTML",
                  title: c.title || "Content Block",
                  htmlContent: c.htmlContent || c.code || c.body || c.content || "",
                  order: cIdx + 1,
                })),
              };
              return { ...l, topics: insertByPos(l.topics || [], createdTopicObj) };
            }
            return l;
          }),
        }));
        setDraftModules(nextMods);
        if (createdTopicObj) {
          handleSelectTopic(createdTopicObj.id, targetLessonId, targetModuleId);
        }
        showToast("Topic created from AI!", "success");
      } else if (scope === "CONTENT") {
        const targetTopicId = contextData.topicId || composeTopicId;
        if (!targetTopicId) {
          showToast("Please select a target topic before adding content.", "error");
          return;
        }

        const newContents = Array.isArray(generatedData?.contents)
          ? generatedData.contents
          : Array.isArray(generatedData)
          ? generatedData
          : [generatedData];

        const nextMods = draftModules.map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((l) => ({
            ...l,
            topics: (l.topics || []).map((t) => {
              if (String(t.id || t._id) === String(targetTopicId)) {
                let cntOrder = ((t.contents || []).length > 0 ? Math.max(...t.contents.map((c) => c.order || 0)) : 0);
                const mappedNewContents = newContents.map((c) => {
                  cntOrder += 1;
                  let type = (c.type || "HTML").toUpperCase();
                  if (type === "TEXT_BLOCK" || type === "MARKDOWN") type = "HTML";
                  if (type === "CODE_BLOCK" || type === "SNIPPET") type = "CODE";

                  return {
                    id: `draft-cnt-${Date.now()}-${cntOrder}`,
                    type,
                    title: c.title || "Content Block",
                    htmlContent: c.htmlContent || c.code || c.body || c.content || "",
                    order: cntOrder,
                  };
                });
                let nextContents = t.contents || [];
                for (const newC of mappedNewContents) {
                  nextContents = insertByPos(nextContents, newC);
                }
                return { ...t, contents: nextContents };
              }
              return t;
            }),
          })),
        }));
        setDraftModules(nextMods);
        showToast("Content added from AI!", "success");
      } else if (scope === "QUIZ") {
        const targetLevel = contextData.quizLevel || "COURSE";
        const quizTitle = generatedData.title || `${targetLevel} Quiz`;
        const quizDesc = generatedData.description || "";
        const rawQuestions = Array.isArray(generatedData.questions) ? generatedData.questions : [];

        // Never invent an answer key: a question the AI returned with no
        // correctAnswer is dropped rather than silently marked "option 1".
        const hasAnswerKey = (q) => {
          const key = q.correctAnswer;
          if (q.questionType === "MCQ_MULTI") {
            return Array.isArray(key) ? key.length > 0 : Boolean(key);
          }
          if (Array.isArray(key)) return key.length > 0 && Boolean(key[0]);
          return Boolean(key) && (typeof key !== "string" || key.trim().length > 0);
        };

        let skippedCount = 0;
        const formattedQuestions = rawQuestions
          .filter((q) => {
            if (hasAnswerKey(q)) return true;
            skippedCount += 1;
            return false;
          })
          .map((q, idx) => ({
            question: q.question || `Question ${idx + 1}`,
            questionType: q.questionType || "MCQ_SINGLE",
            options: Array.isArray(q.options) ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
          }));

        if (formattedQuestions.length === 0) {
          showToast("No questions were applied: none of the generated questions had a correct answer.", "error");
          return;
        }

        // Ask OTree AI generates at Course/Module/Lesson/Topic scope only —
        // a previously selected SubTopic/Concept must not become this quiz's parent.
        setComposeSubTopicId(null);
        setComposeConceptId(null);

        const newQuizData = {
          title: quizTitle,
          description: quizDesc,
          // AI-generated quizzes stay formal assessments, preserving the
          // timed behavior they had before quiz tags existed.
          quizTag: "FINAL",
          passingScore: Number(generatedData.passingScore) || 70,
          timeLimit: Number(generatedData.timeLimit) > 0 ? Number(generatedData.timeLimit) : null,
          isPublished: true,
          questions: formattedQuestions,
        };

        if (targetLevel === "MODULE") {
          setComposeModuleId(contextData.moduleId || composeModuleId);
          setComposeLessonId(null);
          setComposeTopicId(null);
        } else if (targetLevel === "LESSON") {
          setComposeModuleId(contextData.moduleId || composeModuleId);
          setComposeLessonId(contextData.lessonId || composeLessonId);
          setComposeTopicId(null);
        } else if (targetLevel === "TOPIC") {
          setComposeModuleId(contextData.moduleId || composeModuleId);
          setComposeLessonId(contextData.lessonId || composeLessonId);
          setComposeTopicId(contextData.topicId || composeTopicId);
        } else {
          setComposeModuleId(null);
          setComposeLessonId(null);
          setComposeTopicId(null);
        }

        await handleSaveQuiz(newQuizData, { topicScopeOnly: true });
        if (skippedCount > 0) {
          showToast(
            `${targetLevel} quiz created from AI! ${skippedCount} question${skippedCount === 1 ? "" : "s"} ${skippedCount === 1 ? "was" : "were"} skipped because ${skippedCount === 1 ? "it had" : "they had"} no correct answer.`,
            "info"
          );
        } else {
          showToast(`${targetLevel} quiz created from AI!`, "success");
        }
      }
    } catch (err) {
      console.error("Apply AI Data Error:", err);
      showToast("Failed to apply AI generated content.", "error");
    }
  };

  // Lifecycle Modal States

  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteHasStudentData, setDeleteHasStudentData] = useState(false);

  // Auto-open signal for Add Content picker
  const [autoOpenAddSignal, setAutoOpenAddSignal] = useState(0);
  const [courseContentAutoOpenSignal, setCourseContentAutoOpenSignal] = useState(0);
  const [moduleContentAutoOpenSignal, setModuleContentAutoOpenSignal] = useState(0);
  const [lessonContentAutoOpenSignal, setLessonContentAutoOpenSignal] = useState(0);

  // Mobile Drawer State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // The drawer covers the workspace, so let it own the scroll while it is up —
  // without this the page behind scrolls under the user's finger.
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileSidebarOpen]);

  // Mirrors the current workspace selection into the query string, so the page
  // can be reopened exactly where it was left. history.replaceState rather than
  // router.replace on purpose: this is not a navigation — it must not push a
  // history entry per sidebar click, remount the tree, or trigger a server
  // round trip. The URL is only read back on mount (see the state above).
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A quiz that hasn't been created yet has no id to restore, so record the
    // level it is being added under instead of a "quiz" view that would come
    // back as "Quiz Not Found". An open assignment does the same: it lives
    // only in the import draft, so its level is what a reload can reopen.
    const restorableView =
      (composerMode === "quiz" && !composeQuizId) || composerMode === "assignment"
        ? composerModeForSelection({
            conceptId: composeConceptId,
            subTopicId: composeSubTopicId,
            topicId: composeTopicId,
            lessonId: composeLessonId,
            moduleId: composeModuleId,
          })
        : composerMode;

    const next = new URLSearchParams(window.location.search);
    const put = (key, value) => {
      if (value) next.set(key, String(value));
      else next.delete(key);
    };

    put("view", restorableView === "course" ? null : restorableView);
    put("module", composeModuleId);
    put("lesson", composeLessonId);
    put("topic", composeTopicId);
    put("subTopic", composeSubTopicId);
    put("concept", composeConceptId);
    put("quiz", restorableView === "quiz" ? composeQuizId : null);
    put("content", selectedCellId);
    next.delete("compose"); // superseded by `lesson`

    const query = next.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", url);
    }
  }, [composerMode, composeModuleId, composeLessonId, composeTopicId, composeSubTopicId, composeConceptId, composeQuizId, selectedCellId]);

  // Desktop Course Map collapse state
  const [isCourseMapOpen, setIsCourseMapOpen] = useState(true);

  const isDraftMode = courseId === "draft" || courseId === "new";

  // The selected SubTopic/Concept records (import drafts have none). Their
  // loading state matters beyond display: URL restoration must wait for them
  // before deciding a ?subTopic=/?concept= id is invalid.
  const subTopicQuery = useSubTopic(isDraftMode ? null : composeSubTopicId);
  const conceptQuery = useConcept(isDraftMode ? null : composeConceptId);
  const activeSubTopic =
    subTopicQuery.data && String(subTopicQuery.data.id) === String(composeSubTopicId) ? subTopicQuery.data : null;
  const activeConcept =
    conceptQuery.data && String(conceptQuery.data.id) === String(composeConceptId) ? conceptQuery.data : null;
  const composingSubTopicTitle = composeSubTopicId
    ? knownNodeTitles[composeSubTopicId] ?? activeSubTopic?.title ?? null
    : null;
  const composingConceptTitle = composeConceptId
    ? knownNodeTitles[composeConceptId] ?? activeConcept?.title ?? null
    : null;

  // Marks the course as viewed (Course.lastViewedAt). Skipped in draft mode —
  // an unsaved import preview isn't a real course yet.
  const trackViewMutation = useTrackCourseView();
  useEffect(() => {
    if (!isDraftMode && courseId) {
      trackViewMutation.mutate(courseId);
    }
  }, [courseId, isDraftMode]);

  const [draftData, setDraftData] = useState(null);
  const [draftModules, setDraftModules] = useState([]);
  const [draftQuizzes, setDraftQuizzes] = useState([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Ensures all modules, lessons, topics, contents, and quizzes have non-empty string IDs in draft mode
  const ensureDraftIds = (modules = [], courseQuizzes = []) => {
    const mappedQuizzes = (courseQuizzes || []).map((quiz, qIdx) => {
      const qzId = quiz.id || `draft-quiz-course-${qIdx + 1}`;
      return {
        ...quiz,
        id: qzId,
        questions: (quiz.questions || []).map((q, quIdx) => ({
          ...q,
          id: q.id || `draft-que-${qzId}-${quIdx + 1}`,
        })),
      };
    });

    const mappedModules = (modules || []).map((mod, mIdx) => {
      const modId = mod.id || `draft-mod-${mIdx + 1}`;
      return {
        ...mod,
        id: modId,
        contents: withDraftItemIds(mod.contents, `draft-cnt-mod-${mIdx + 1}`),
        assignments: withDraftItemIds(mod.assignments, `draft-asg-mod-${mIdx + 1}`),
        quizzes: (mod.quizzes || []).map((quiz, qIdx) => {
          const qzId = quiz.id || `draft-quiz-mod-${mIdx + 1}-${qIdx + 1}`;
          return {
            ...quiz,
            id: qzId,
            moduleId: quiz.moduleId || modId,
            questions: (quiz.questions || []).map((q, quIdx) => ({
              ...q,
              id: q.id || `draft-que-${qzId}-${quIdx + 1}`,
            })),
          };
        }),
        lessons: (mod.lessons || []).map((les, lIdx) => {
          const lesId = les.id || `draft-les-${mIdx + 1}-${lIdx + 1}`;
          return {
            ...les,
            id: lesId,
            contents: withDraftItemIds(les.contents, `draft-cnt-les-${mIdx + 1}-${lIdx + 1}`),
            assignments: withDraftItemIds(les.assignments, `draft-asg-les-${mIdx + 1}-${lIdx + 1}`),
            quizzes: (les.quizzes || []).map((quiz, qIdx) => {
              const qzId = quiz.id || `draft-quiz-les-${mIdx + 1}-${lIdx + 1}-${qIdx + 1}`;
              return {
                ...quiz,
                id: qzId,
                moduleId: quiz.moduleId || modId,
                lessonId: quiz.lessonId || lesId,
                questions: (quiz.questions || []).map((q, quIdx) => ({
                  ...q,
                  id: q.id || `draft-que-${qzId}-${quIdx + 1}`,
                })),
              };
            }),
            topics: (les.topics || []).map((top, tIdx) => {
              const topId = top.id || `draft-top-${mIdx + 1}-${lIdx + 1}-${tIdx + 1}`;
              const topQuizzes = top.quizzes || (top.quiz ? [top.quiz] : []);
              return {
                ...top,
                id: topId,
                assignments: withDraftItemIds(top.assignments, `draft-asg-top-${mIdx + 1}-${lIdx + 1}-${tIdx + 1}`),
                quizzes: topQuizzes.map((quiz, qIdx) => {
                  const qzId = quiz.id || `draft-quiz-top-${mIdx + 1}-${lIdx + 1}-${tIdx + 1}-${qIdx + 1}`;
                  return {
                    ...quiz,
                    id: qzId,
                    moduleId: quiz.moduleId || modId,
                    lessonId: quiz.lessonId || lesId,
                    topicId: quiz.topicId || topId,
                    questions: (quiz.questions || []).map((q, quIdx) => ({
                      ...q,
                      id: q.id || `draft-que-${qzId}-${quIdx + 1}`,
                    })),
                  };
                }),
                contents: (top.contents || []).map((cnt, cIdx) => ({
                  ...cnt,
                  id: cnt.id || `draft-cnt-${mIdx + 1}-${lIdx + 1}-${tIdx + 1}-${cIdx + 1}`,
                })),
              };
            }),
          };
        }),
      };
    });

    return { modules: mappedModules, quizzes: mappedQuizzes };
  };

  // Load temporary draft from sessionStorage if in draft mode
  useEffect(() => {
    if (isDraftMode) {
      try {
        const raw = sessionStorage.getItem("imported_course_draft");
        if (raw) {
          const parsed = JSON.parse(raw);
          const canonical = parsed.canonicalJson || {};
          setDraftData({
            ...parsed,
            canonicalJson: {
              ...canonical,
              contents: withDraftItemIds(canonical.contents, "draft-cnt-course"),
              assignments: withDraftItemIds(canonical.assignments, "draft-asg-course"),
            },
          });
          const inputModules = parsed.modules || parsed.canonicalJson?.modules || [];
          const inputQuizzes = parsed.quizzes || parsed.canonicalJson?.quizzes || [];
          const { modules: mappedMods, quizzes: mappedQuiz } = ensureDraftIds(inputModules, inputQuizzes);
          setDraftModules(mappedMods);
          setDraftQuizzes(mappedQuiz);
          setCourseForm({
            title: parsed.metadata?.title || "Imported Course",
            subtitle: parsed.metadata?.description || "",
            description: parsed.metadata?.description || "",
            category: parsed.metadata?.category || "General",
            level: parsed.metadata?.level || "BEGINNER",
            thumbnailUrl: parsed.metadata?.thumbnailUrl || "",
            duration: parsed.metadata?.estimatedLearningHours ? `${parsed.metadata.estimatedLearningHours} hours` : "",
            audience: "",
            author: "",
          });
        }
      } catch (err) {
        console.error("Failed to parse imported_course_draft from sessionStorage:", err);
      } finally {
        setDraftLoaded(true);
      }
    }
  }, [isDraftMode]);

  // Sync normal course data into form state when loading real database record
  useEffect(() => {
    if (!isDraftMode && course) {
      setCourseForm({
        title: course.title || "",
        subtitle: course.subtitle || course.shortDescription || "",
        description: course.description || "",
        category: course.category || "",
        level: course.level || "Beginner",
        thumbnailUrl: course.thumbnailUrl || "",
        duration: course.duration || "",
        audience: course.audience || "",
        author: course.author || course.creator?.name || "",
      });
    }
  }, [isDraftMode, course]);

  // Quiz rows carry every ancestor id they were created with, so each level
  // excludes quizzes placed deeper (down to SubTopic/Concept) — those are
  // shown on their own lazily loaded Course Map rows via `quizPool`.
  const effectiveCourseQuizzes = (isDraftMode ? draftQuizzes : (course?.quizzes || [])).filter(
    (q) => !q.moduleId && !q.lessonId && !q.topicId && !q.subTopicId && !q.conceptId
  );

  const effectiveCourse = isDraftMode
    ? (draftData ? {
        id: "draft",
        title: courseForm.title || draftData.metadata?.title || "Imported Course",
        description: courseForm.description || draftData.metadata?.description || "",
        category: courseForm.category || draftData.metadata?.category || "General",
        level: courseForm.level || draftData.metadata?.level || "BEGINNER",
        thumbnailUrl: courseForm.thumbnailUrl || draftData.metadata?.thumbnailUrl || null,
        status: "DRAFT",
        isImportDraft: true,
        quizzes: effectiveCourseQuizzes,
      } : null)
    : (course ? { ...course, quizzes: effectiveCourseQuizzes } : null);

  // What the server currently holds, in the shape courseForm uses — the two
  // are compared to decide whether the header offers a Save at all.
  const savedCourseForm = useMemo(
    () => ({
      title: course?.title || "",
      subtitle: course?.subtitle || course?.shortDescription || "",
      description: course?.description || "",
      category: course?.category || "",
      level: course?.level || "Beginner",
      thumbnailUrl: course?.thumbnailUrl || "",
      duration: course?.duration || "",
      audience: course?.audience || "",
      author: course?.author || course?.creator?.name || "",
    }),
    [course]
  );

  // An imported draft has never been written, so it always has something to
  // save. A real course only does once its meta drifts from the saved record;
  // courseForm starts empty and is filled by the sync effect, so an unfilled
  // form counts as clean rather than as a full set of changes.
  const hasUnsavedChanges = isDraftMode
    ? true
    : Boolean(course) &&
      Object.keys(courseForm).length > 0 &&
      Object.keys(savedCourseForm).some(
        (key) => (courseForm[key] ?? "") !== savedCourseForm[key]
      );

  const effectiveModules = (isDraftMode ? draftModules : (modules || [])).map((mod) => {
    const rawModQuizzes = (mod.quizzes && mod.quizzes.length > 0)
      ? mod.quizzes
      : (isDraftMode ? draftQuizzes : (course?.quizzes || [])).filter(
          (q) => q.moduleId && (String(q.moduleId) === String(mod.id) || String(q.moduleId) === String(mod._id))
        );

    return {
      ...mod,
      quizzes: rawModQuizzes.filter((q) => !q.lessonId && !q.topicId && !q.subTopicId && !q.conceptId),
      lessons: (mod.lessons || []).map((lesson) => {
        const rawLesQuizzes = (lesson.quizzes && lesson.quizzes.length > 0)
          ? lesson.quizzes
          : (isDraftMode ? draftQuizzes : (course?.quizzes || [])).filter(
              (q) => q.lessonId && (String(q.lessonId) === String(lesson.id) || String(q.lessonId) === String(lesson._id))
            );

        return {
          ...lesson,
          quizzes: rawLesQuizzes.filter((q) => !q.topicId && !q.subTopicId && !q.conceptId),
          topics: (lesson.topics || []).map((topic) => {
            const rawTopQuizzes = (topic.quizzes && topic.quizzes.length > 0)
              ? topic.quizzes
              : (topic.quiz ? [topic.quiz] : (isDraftMode ? draftQuizzes : (course?.quizzes || [])).filter(
                  (q) => q.topicId && (String(q.topicId) === String(topic.id) || String(q.topicId) === String(topic._id))
                ));

            return {
              ...topic,
              quizzes: rawTopQuizzes.filter((q) => !q.subTopicId && !q.conceptId),
            };
          }),
        };
      }),
    };
  });
  const effectiveLoading = isDraftMode ? (!draftLoaded || !draftData) : (courseLoading || modulesLoading);
  const effectiveError = isDraftMode ? (draftLoaded && !draftData) : (courseError || !course);

  // Selection Handlers
  const handleSelectCourseOverview = () => {
    setComposerMode("course");
    setQuizMode("view");
    setComposeLessonId(null);
    setComposeModuleId(null);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizStartEditing(false);
    setSelectedCellId(null);
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  // The Course Map appends a context object ({ module, lesson, topic,
  // subTopic, concept }) after the positional arguments; a quiz opened from
  // anywhere else falls back to its own parent ids.
  const handleSelectQuiz = (quiz, mod = null, lesson = null, topic = null, options = {}, context = null) => {
    if (!quiz) return;

    if (topic && typeof topic === "object" && ("startEditing" in topic || "isEditing" in topic || "mode" in topic)) {
      options = topic;
      topic = null;
    }

    const qId = quiz.id || quiz._id;
    setComposeQuizId(qId);
    setSelectedQuizState(quiz);

    const targetModuleId = mod?.id || mod?._id || quiz.moduleId || null;
    const targetLessonId = lesson?.id || lesson?._id || quiz.lessonId || null;
    const targetTopicId = topic?.id || topic?._id || quiz.topicId || null;

    const targetSubTopic = context?.subTopic || null;
    const targetConcept = context?.concept || null;
    rememberNodeTitle(targetSubTopic);
    rememberNodeTitle(targetConcept);

    setComposeModuleId(targetModuleId);
    setComposeLessonId(targetLessonId);
    setComposeTopicId(targetTopicId);
    setComposeSubTopicId(targetSubTopic?.id || quiz.subTopicId || null);
    setComposeConceptId(targetConcept?.id || quiz.conceptId || null);
    setSelectedCellId(null);

    const startEdit = Boolean(options?.startEditing);
    setQuizMode(startEdit ? "edit" : "view");
    setComposerMode("quiz");
    setQuizStartEditing(startEdit);
    setMobileSidebarOpen(false);
  };

  // The course map passes (assignment, module, lesson, topic, options) — the
  // levels above the assignment are null for a course-level one.
  const handleSelectAssignment = (assignment, mod = null, lesson = null, topic = null, options = {}) => {
    if (!assignment) return;
    setComposeAssignmentId(assignment.id);
    setSelectedAssignmentState(assignment);
    setComposeModuleId(mod?.id || null);
    setComposeLessonId(lesson?.id || null);
    setComposeTopicId(topic?.id || null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setSelectedCellId(null);
    setAssignmentStartEditing(Boolean(options?.startEditing));
    setComposerMode("assignment");
    setMobileSidebarOpen(false);
  };

  // No `order` parameter: a Course-level quiz is always appended to the end of
  // the course sequence (see backend contentOrder.util.js), unlike every other
  // level, where "Add Quiz here" can position the new quiz.
  const handleAddCourseQuiz = () => {
    setComposeModuleId(null);
    setComposeLessonId(null);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(null);
    setMobileSidebarOpen(false);
  };

  const handleAddModuleQuiz = (mod, order) => {
    const targetModuleId = mod?.id || mod?._id || composeModuleId;
    setComposeModuleId(targetModuleId);
    setComposeLessonId(null);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(order ?? null);
    setMobileSidebarOpen(false);
  };

  const handleAddLessonQuiz = (lesson, mod = null, order) => {
    const targetModuleId = mod?.id || mod?._id || composeModuleId;
    setComposeModuleId(targetModuleId || null);
    setComposeLessonId(lesson?.id || lesson?._id || null);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(order ?? null);
    setMobileSidebarOpen(false);
  };

  const handleAddTopicQuiz = (topic, lesson = null, mod = null, order) => {
    const targetLessonId = lesson?.id || lesson?._id || composeLessonId;
    const targetModuleId = mod?.id || mod?._id || composeModuleId;
    setComposeModuleId(targetModuleId || null);
    setComposeLessonId(targetLessonId || null);
    setComposeTopicId(topic?.id || topic?._id || null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(order ?? null);
    setMobileSidebarOpen(false);
  };

  // A SubTopic/Concept quiz keeps every ancestor id alongside its own, the
  // same way Topic quizzes are created — the backend validates the chain and
  // places the quiz at its most specific parent. `context` comes from the
  // Course Map; the in-panel Add Quiz passes none and relies on the current
  // selection instead.
  const handleAddSubTopicQuiz = (subTopic, context = {}, order) => {
    rememberNodeTitle(subTopic);
    setComposeModuleId(context.module?.id || composeModuleId || null);
    setComposeLessonId(context.lesson?.id || composeLessonId || null);
    setComposeTopicId(context.topic?.id || subTopic?.topicId || composeTopicId || null);
    setComposeSubTopicId(subTopic?.id || null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(order ?? null);
    setMobileSidebarOpen(false);
  };

  const handleAddConceptQuiz = (concept, context = {}, order) => {
    rememberNodeTitle(context.subTopic);
    rememberNodeTitle(concept);
    setComposeModuleId(context.module?.id || composeModuleId || null);
    setComposeLessonId(context.lesson?.id || composeLessonId || null);
    setComposeTopicId(context.topic?.id || composeTopicId || null);
    setComposeSubTopicId(context.subTopic?.id || concept?.subTopicId || composeSubTopicId || null);
    setComposeConceptId(concept?.id || null);
    setComposeQuizId(null);
    setSelectedQuizState(null);
    setQuizMode("create");
    setComposerMode("quiz");
    setQuizStartEditing(true);
    setSelectedCellId(null);
    setPendingQuizOrder(order ?? null);
    setMobileSidebarOpen(false);
  };

  // QuizOverviewView's editor authors questions inline as local state — they
  // aren't Content rows, they're real Question-repository entities linked to
  // the quiz via QuizQuestion, so saving the quiz metadata alone (the plain
  // createQuizService/updateQuizService calls below) never persisted them.
  // This maps that local question shape onto what /questions/bulk and
  // /questions/:id expect.
  const mapQuestionForApi = (q) => ({
    question: q.question,
    questionType: q.questionType,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    marks: Number(q.marks) || 1,
    difficulty: q.difficulty,
  });

  // Diffs the editor's current question list against what the quiz actually
  // had before this save (empty for a brand-new quiz): new rows (no id, or a
  // locally-generated "draft-que-" id) get bulk-created and attached; rows
  // that already existed get their fields updated in place; anything that
  // existed before but isn't in the current list anymore gets unlinked.
  const syncQuizQuestions = async (quizId, currentQuestions, originalQuestionIds) => {
    const isNew = (q) => !q.id || String(q.id).startsWith("draft-");
    const originalIdSet = new Set((originalQuestionIds || []).map(String));

    const newQuestions = (currentQuestions || []).filter(isNew);
    const existingQuestions = (currentQuestions || []).filter((q) => !isNew(q));
    // A repository question picked via "From Repository" already has a real
    // id but wasn't linked to this quiz before this save — attach it as-is
    // rather than overwriting its (possibly shared, used-elsewhere) content.
    // Only a question that was already this quiz's own gets its edits saved.
    const alreadyLinkedQuestions = existingQuestions.filter((q) => originalIdSet.has(String(q.id)));
    const newlyAttachedQuestionIds = existingQuestions
      .filter((q) => !originalIdSet.has(String(q.id)))
      .map((q) => q.id);

    const keptIds = new Set(existingQuestions.map((q) => String(q.id)));
    const removedIds = (originalQuestionIds || []).filter((id) => !keptIds.has(String(id)));

    if (newQuestions.length > 0) {
      await bulkCreateQuestionsService(quizId, newQuestions.map(mapQuestionForApi));
    }
    if (newlyAttachedQuestionIds.length > 0) {
      await importQuestionsToQuizService(quizId, newlyAttachedQuestionIds);
    }
    for (const q of alreadyLinkedQuestions) {
      await updateRepositoryQuestion(q.id, mapQuestionForApi(q));
    }
    for (const id of removedIds) {
      await removeQuestionFromQuizService(quizId, id);
    }
  };

  const handleSaveQuiz = async (updatedQuizData, { topicScopeOnly = false } = {}) => {
    if (isDraftMode) {
      let createdQuiz;
      if (quizMode === "create" || !selectedQuizState) {
        const isTopicQuiz = Boolean(composeTopicId);
        const isLessonQuiz = !isTopicQuiz && Boolean(composeLessonId);
        createdQuiz = {
          id: `draft-quiz-${isTopicQuiz ? "topic" : isLessonQuiz ? "lesson" : "mod"}-${Date.now()}`,
          title: updatedQuizData.title || (isTopicQuiz ? "Topic Quiz" : isLessonQuiz ? "Lesson Quiz" : "Module Quiz"),
          description: updatedQuizData.description || "",
          quizTag: updatedQuizData.quizTag,
          passingScore: Number(updatedQuizData.passingScore) || 70,
          // No `|| 30` fallback: null means the instructor chose no timer,
          // and re-inflating it here would defeat that before it ever saved.
          timeLimit: updatedQuizData.timeLimit ?? null,
          attempts: updatedQuizData.attempts ?? 1,
          isPublished: updatedQuizData.isPublished !== false,
          moduleId: composeModuleId,
          lessonId: composeLessonId || null,
          topicId: composeTopicId || null,
          scope: isTopicQuiz ? "TOPIC" : isLessonQuiz ? "LESSON" : "MODULE",
          questions: updatedQuizData.questions || [],
        };

        const nextDraftModules = draftModules.map((m) => {
          if (m.id !== composeModuleId) return m;
          if (isTopicQuiz) {
            return {
              ...m,
              lessons: (m.lessons || []).map((l) => {
                if (l.id !== composeLessonId) return l;
                return {
                  ...l,
                  topics: (l.topics || []).map((t) => {
                    if (t.id !== composeTopicId) return t;
                    return {
                      ...t,
                      quizzes: [...(t.quizzes || []), createdQuiz],
                    };
                  }),
                };
              }),
            };
          }
          if (isLessonQuiz) {
            return {
              ...m,
              lessons: (m.lessons || []).map((l) =>
                l.id === composeLessonId
                  ? { ...l, quizzes: [...(l.quizzes || []), createdQuiz] }
                  : l
              ),
            };
          }
          return {
            ...m,
            quizzes: [...(m.quizzes || []), createdQuiz],
          };
        });

        setDraftModules(nextDraftModules);

        if (draftData) {
          const updatedDraft = {
            ...draftData,
            modules: nextDraftModules,
          };
          setDraftData(updatedDraft);
          sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
        }

        showToast(isTopicQuiz ? "Topic quiz created in draft!" : isLessonQuiz ? "Lesson quiz created in draft!" : "Module quiz created in draft!", "success");
      } else {
        const targetId = selectedQuizState.id || selectedQuizState._id || composeQuizId;
        const isCourseQuiz = draftQuizzes.some(
          (q) => targetId && (String(q.id || q._id) === String(targetId))
        );
        const isTopicQuiz = !isCourseQuiz && Boolean(composeTopicId || selectedQuizState.topicId);
        const isLessonQuiz = !isCourseQuiz && !isTopicQuiz && Boolean(composeLessonId || selectedQuizState.lessonId);

        let nextDraftQuizzes = [...draftQuizzes];
        let nextDraftModules = [...draftModules];

        if (isCourseQuiz || (!composeModuleId && !isLessonQuiz && !isTopicQuiz)) {
          nextDraftQuizzes = nextDraftQuizzes.map((q) => {
            if (targetId && String(q.id || q._id) === String(targetId)) {
              return { ...q, ...updatedQuizData };
            }
            return q;
          });
          createdQuiz = { ...selectedQuizState, ...updatedQuizData };
        } else if (isTopicQuiz) {
          nextDraftModules = nextDraftModules.map((mod) => ({
            ...mod,
            lessons: (mod.lessons || []).map((l) => ({
              ...l,
              topics: (l.topics || []).map((t) => {
                if (!(t.quizzes || []).some((q) => targetId && String(q.id || q._id) === String(targetId))) {
                  return t;
                }
                return {
                  ...t,
                  quizzes: (t.quizzes || []).map((q) =>
                    targetId && String(q.id || q._id) === String(targetId) ? { ...q, ...updatedQuizData } : q
                  ),
                };
              }),
            })),
          }));
          createdQuiz = { ...selectedQuizState, ...updatedQuizData };
        } else if (isLessonQuiz) {
          nextDraftModules = nextDraftModules.map((mod) => ({
            ...mod,
            lessons: (mod.lessons || []).map((l) => {
              if (!(l.quizzes || []).some((q) => targetId && String(q.id || q._id) === String(targetId))) {
                return l;
              }
              return {
                ...l,
                quizzes: (l.quizzes || []).map((q) =>
                  targetId && String(q.id || q._id) === String(targetId) ? { ...q, ...updatedQuizData } : q
                ),
              };
            }),
          }));
          createdQuiz = { ...selectedQuizState, ...updatedQuizData };
        } else {
          nextDraftModules = nextDraftModules.map((mod) => {
            if (mod.id === composeModuleId || (mod.quizzes || []).some((q) => targetId && String(q.id || q._id) === String(targetId))) {
              const updatedQuizzes = (mod.quizzes || []).map((q) => {
                if (targetId && String(q.id || q._id) === String(targetId)) {
                  return { ...q, ...updatedQuizData };
                }
                return q;
              });
              return { ...mod, quizzes: updatedQuizzes };
            }
            return mod;
          });
          createdQuiz = { ...selectedQuizState, ...updatedQuizData };
        }

        setDraftQuizzes(nextDraftQuizzes);
        setDraftModules(nextDraftModules);

        if (draftData) {
          const updatedDraft = {
            ...draftData,
            quizzes: nextDraftQuizzes,
            modules: nextDraftModules,
          };
          setDraftData(updatedDraft);
          sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
        }

        showToast("Quiz updated in draft!", "success", "Saved");
      }

      setSelectedQuizState(createdQuiz);
      setComposeQuizId(createdQuiz.id);
      setQuizMode("view");
      setQuizStartEditing(false);
      // Every branch reports whether the quiz actually landed. QuizOverviewView
      // awaits this and only raises its "Quiz Saved" confirmation on true — the
      // failure branches below already explain themselves with an error toast,
      // and a success dialog on top of one would be a lie.
      return true;
    } else {
      // Saved Course Mode (via REST API)
      if (quizMode === "create" || !selectedQuizState) {
        try {
          const resQuiz = await createQuizService({
            title: updatedQuizData.title || (!topicScopeOnly && composeConceptId ? "Concept Quiz" : !topicScopeOnly && composeSubTopicId ? "SubTopic Quiz" : composeTopicId ? "Topic Quiz" : composeLessonId ? "Lesson Quiz" : "Module Quiz"),
            description: updatedQuizData.description || "",
            quizTag: updatedQuizData.quizTag,
            passingScore: Number(updatedQuizData.passingScore) || 70,
            timeLimit: updatedQuizData.timeLimit ?? null,
            // Omitted when the caller didn't set it, so the schema default applies.
            ...(updatedQuizData.attempts !== undefined && { attempts: Number(updatedQuizData.attempts) }),
            isPublished: updatedQuizData.isPublished !== false,
            courseId,
            moduleId: composeModuleId || null,
            lessonId: composeLessonId || null,
            topicId: composeTopicId || null,
            // Only sent when set, so a Course/Module/Lesson/Topic quiz's
            // payload is exactly what it was before SubTopics existed.
            ...(!topicScopeOnly && composeSubTopicId ? { subTopicId: composeSubTopicId } : {}),
            ...(!topicScopeOnly && composeConceptId ? { conceptId: composeConceptId } : {}),
            order: pendingQuizOrder ?? undefined,
          });
          setPendingQuizOrder(null);

          if (updatedQuizData.questions?.length > 0) {
            try {
              await syncQuizQuestions(resQuiz.id, updatedQuizData.questions, []);
            } catch (qErr) {
              console.error("Save Quiz Questions Error:", qErr);
              showToast(qErr?.response?.data?.message || "Quiz created, but some questions failed to save.", "error");
            }
          }

          // Reflect the new quiz in the Course Map immediately from this
          // response. course.quizzes (QUERY_KEYS.COURSE) — not mod/lesson/
          // topic.quizzes on the MODULES cache — is the actual source of
          // truth effectiveModules falls back to, since getModules() never
          // includes a quizzes relation at any level. Writing into
          // mod/lesson/topic.quizzes there always started from an empty
          // array, so each new quiz replaced the visible list instead of
          // joining it. Appending to course.quizzes works identically for
          // Course/Module/Lesson/Topic — effectiveModules' existing
          // moduleId/lessonId/topicId filtering places each quiz correctly.
          const newQuiz = { ...resQuiz, questions: updatedQuizData.questions || [] };
          queryClient.setQueryData([QUERY_KEYS.COURSE, courseId], (old) =>
            old ? { ...old, quizzes: [...(old.quizzes || []), newQuiz] } : old
          );

          let freshQuiz = resQuiz;
          try {
            freshQuiz = await getQuizByIdService(resQuiz.id);
          } catch (fetchErr) {
            freshQuiz = { ...resQuiz, questions: updatedQuizData.questions || [] };
          }

          await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: [QUERY_KEYS.COURSE, courseId] }),
            queryClient.refetchQueries({ queryKey: [QUERY_KEYS.COURSE, courseId, "meta"] }),
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] }),
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZZES] }),
          ]);

          showToast(
            !topicScopeOnly && composeConceptId
              ? "Concept quiz created successfully!"
              : !topicScopeOnly && composeSubTopicId
              ? "SubTopic quiz created successfully!"
              : composeTopicId
              ? "Topic quiz created successfully!"
              : composeLessonId
              ? "Lesson quiz created successfully!"
              : "Module quiz created successfully!",
            "success"
          );
          setSelectedQuizState(freshQuiz);
          setComposeQuizId(resQuiz.id);
          setQuizMode("view");
          setQuizStartEditing(false);
          return true;
        } catch (err) {
          console.error("Create Quiz Error:", err);
          showToast(err?.response?.data?.message || "Failed to create quiz.", "error");
          return false;
        }
      } else {
        const targetId = selectedQuizState.id || selectedQuizState._id || composeQuizId;
        try {
          const resQuiz = await updateQuizService(targetId, {
            title: updatedQuizData.title,
            description: updatedQuizData.description,
            quizTag: updatedQuizData.quizTag,
            passingScore: Number(updatedQuizData.passingScore),
            // Number(null) is 0, not null — and 0 would reach the API as a
            // real time limit rather than "untimed".
            timeLimit: updatedQuizData.timeLimit ?? null,
            ...(updatedQuizData.attempts !== undefined && { attempts: Number(updatedQuizData.attempts) }),
            isPublished: updatedQuizData.isPublished,
            courseId,
            moduleId: composeModuleId || selectedQuizState.moduleId || null,
            lessonId: composeLessonId || selectedQuizState.lessonId || null,
            topicId: composeTopicId || selectedQuizState.topicId || null,
          });

          const updatedQuiz = resQuiz || { ...selectedQuizState, ...updatedQuizData };

          try {
            const originalQuestionIds = (selectedQuizState.quizQuestions || [])
              .map((qq) => qq.question?.id || qq.questionId)
              .filter(Boolean);
            await syncQuizQuestions(targetId, updatedQuizData.questions || [], originalQuestionIds);
          } catch (qErr) {
            console.error("Save Quiz Questions Error:", qErr);
            showToast(qErr?.response?.data?.message || "Quiz updated, but some questions failed to save.", "error");
          }

          let freshQuiz = updatedQuiz;
          try {
            freshQuiz = await getQuizByIdService(targetId);
          } catch (fetchErr) {
            freshQuiz = updatedQuiz;
          }

          await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: [QUERY_KEYS.COURSE, courseId] }),
            queryClient.refetchQueries({ queryKey: [QUERY_KEYS.COURSE, courseId, "meta"] }),
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] }),
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUIZZES] }),
          ]);

          showToast("Quiz updated successfully!", "success");
          setSelectedQuizState(freshQuiz);
          setQuizMode("view");
          setQuizStartEditing(false);
          return true;
        } catch (err) {
          console.error("Update Quiz Error:", err);
          showToast(err?.response?.data?.message || "Failed to update quiz.", "error");
          return false;
        }
      }
    }
  };

  const handleCancelQuizEdit = () => {
    if (composeConceptId) {
      setComposerMode("concept");
    } else if (composeSubTopicId) {
      setComposerMode("subTopic");
    } else if (composeTopicId) {
      setComposerMode("topic");
    } else if (composeLessonId) {
      setComposerMode("lesson");
    } else if (composeModuleId) {
      setComposerMode("module");
    } else {
      handleSelectCourseOverview();
    }
    setQuizMode("view");
    setQuizStartEditing(false);
  };

  const handleDuplicateQuiz = async (quiz, mod = null, lesson = null, topic = null) => {
    const dupId = `draft-quiz-${topic ? "topic" : lesson ? "lesson" : mod ? "mod" : "course"}-${Date.now()}`;
    const duplicatedQuiz = {
      ...quiz,
      id: dupId,
      title: `${quiz.title || "Quiz"} (Copy)`,
      questions: (quiz.questions || (quiz.quizQuestions || []).map((qq) => qq.question) || []).map((q, qIdx) => ({
        ...q,
        id: `draft-que-${dupId}-${qIdx + 1}`,
      })),
    };

    if (isDraftMode) {
      let nextDraftQuizzes = [...draftQuizzes];
      let nextDraftModules = [...draftModules];

      if (topic && lesson && mod) {
        nextDraftModules = nextDraftModules.map((m) =>
          m.id === mod.id
            ? {
                ...m,
                lessons: (m.lessons || []).map((l) =>
                  l.id === lesson.id
                    ? {
                        ...l,
                        topics: (l.topics || []).map((t) =>
                          t.id === topic.id ? { ...t, quizzes: [...(t.quizzes || []), duplicatedQuiz] } : t
                        ),
                      }
                    : l
                ),
              }
            : m
        );
      } else if (lesson && mod) {
        nextDraftModules = nextDraftModules.map((m) =>
          m.id === mod.id
            ? {
                ...m,
                lessons: (m.lessons || []).map((l) =>
                  l.id === lesson.id ? { ...l, quizzes: [...(l.quizzes || []), duplicatedQuiz] } : l
                ),
              }
            : m
        );
      } else if (!mod) {
        nextDraftQuizzes.push(duplicatedQuiz);
      } else {
        nextDraftModules = nextDraftModules.map((m) => {
          if (m.id === mod.id) {
            return {
              ...m,
              quizzes: [...(m.quizzes || []), duplicatedQuiz],
            };
          }
          return m;
        });
      }

      setDraftQuizzes(nextDraftQuizzes);
      setDraftModules(nextDraftModules);

      if (draftData) {
        const updatedDraft = {
          ...draftData,
          quizzes: nextDraftQuizzes,
          modules: nextDraftModules,
        };
        setDraftData(updatedDraft);
        sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
      }

      showToast("Quiz duplicated in draft!", "success");
      handleSelectQuiz(duplicatedQuiz, mod, lesson, topic, { startEditing: false });
    } else {
      try {
        const { order, id: _copiedId, _id: _copiedMongoId, quizQuestions, ...quizFieldsToCopy } = quiz;
        await api.post("/quizzes", {
          ...quizFieldsToCopy,
          title: `${quiz.title || "Quiz"} (Copy)`,
          courseId,
          moduleId: mod?.id || null,
          lessonId: lesson?.id || null,
          topicId: topic?.id || null,
        });
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] });
        showToast("Quiz duplicated successfully!", "success");
      } catch (err) {
        showToast("Failed to duplicate quiz.", "error");
      }
    }
  };

  const handleDeleteQuiz = async (e, quiz, mod = null, lesson = null, topic = null) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${quiz.title || "this quiz"}"?`)) return;

    if (isDraftMode) {
      const qTargetId = quiz.id || quiz._id;
      let nextDraftQuizzes = draftQuizzes.filter((q) => String(q.id || q._id) !== String(qTargetId));
      let nextDraftModules = draftModules.map((m) => {
        if (topic && lesson && mod && m.id === mod.id) {
          return {
            ...m,
            lessons: (m.lessons || []).map((l) =>
              l.id === lesson.id
                ? {
                    ...l,
                    topics: (l.topics || []).map((t) =>
                      t.id === topic.id
                        ? { ...t, quizzes: (t.quizzes || []).filter((q) => String(q.id || q._id) !== String(qTargetId)) }
                        : t
                    ),
                  }
                : l
            ),
          };
        }
        if (lesson && mod && m.id === mod.id) {
          return {
            ...m,
            lessons: (m.lessons || []).map((l) =>
              l.id === lesson.id
                ? { ...l, quizzes: (l.quizzes || []).filter((q) => String(q.id || q._id) !== String(qTargetId)) }
                : l
            ),
          };
        }
        if (!lesson && mod && m.id === mod.id) {
          return {
            ...m,
            quizzes: (m.quizzes || []).filter((q) => String(q.id || q._id) !== String(qTargetId)),
          };
        }
        return m;
      });

      setDraftQuizzes(nextDraftQuizzes);
      setDraftModules(nextDraftModules);

      if (draftData) {
        const updatedDraft = {
          ...draftData,
          quizzes: nextDraftQuizzes,
          modules: nextDraftModules,
        };
        setDraftData(updatedDraft);
        sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
      }

      showToast("Quiz deleted from draft!", "info");

      if (composeQuizId && String(composeQuizId) === String(qTargetId)) {
        handleSelectCourseOverview();
      }
    } else {
      try {
        const qTargetId = quiz.id || quiz._id;
        if (qTargetId && !String(qTargetId).startsWith("draft-")) {
          await deleteQuizService(qTargetId);
          await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] });
        }
        showToast("Quiz deleted successfully!", "success");
        if (composeQuizId && String(composeQuizId) === String(qTargetId)) {
          handleSelectCourseOverview();
        }
      } catch (err) {
        showToast("Failed to delete quiz from server.", "error");
      }
    }
  };

  const handleSelectLesson = (lessonId) => {
    setComposeLessonId(lessonId);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setComposerMode("lesson");
    setSelectedCellId(null);
    setAutoOpenAddSignal(0);

    const { lesson: foundLesson, module: foundModule } = findModuleAndLessonById(effectiveModules, lessonId);
    if (foundLesson) {
      setLessonForm({
        title: foundLesson.title || "",
        subtitle: foundLesson.subtitle || "",
        summary: foundLesson.summary || foundLesson.description || "",
      });
      if (foundModule) {
        setComposeModuleId(foundModule.id);
      }
    }
    setMobileSidebarOpen(false);
  };

  const handleSelectModule = (mod, lessonId = null) => {
    setComposeModuleId(mod.id);
    setComposeLessonId(lessonId);
    setComposeTopicId(null);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setComposerMode("module");
    setSelectedCellId(null);
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  const handleSelectTopic = (topicId, lessonId, moduleId) => {
    setComposeTopicId(topicId);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeLessonId(lessonId);
    setComposeModuleId(moduleId);
    setComposeQuizId(null);
    setComposerMode("topic");
    setSelectedCellId(null);
    // Root-cause fix: without this, a stale autoOpenAddSignal left over from
    // an earlier "+ Add Content" click (anywhere, anytime this session)
    // survives here, and since LessonComposerPanel remounts fresh every time
    // composerMode re-enters "topic" (its handledAutoOpenSignal ref resets
    // to undefined on remount while this counter never resets on its own),
    // the panel's mount effect misreads that leftover signal as a brand-new
    // request and immediately pops "Add New Content Cell" over this existing
    // topic's real content. Clearing it here — before the panel mounts —
    // ensures a plain "select existing topic" click never carries forward an
    // unconsumed create-content request.
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  const handleSelectContent = (content, topic, lesson, mod) => {
    setComposeTopicId(topic.id);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    setComposeLessonId(lesson.id);
    setComposeModuleId(mod.id);
    setComposeQuizId(null);
    setComposerMode("topic");
    setSelectedCellId(content.id);
    // Same fix as handleSelectTopic: clear any leftover auto-open signal so
    // this fresh LessonComposerPanel mount doesn't misread it as a request
    // to open the create modal instead of showing the clicked content.
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  const handleAddContentFromSidebar = (topicId, lessonId, moduleId) => {
    setComposeTopicId(topicId);
    setComposeSubTopicId(null);
    setComposeConceptId(null);
    if (lessonId) setComposeLessonId(lessonId);
    if (moduleId) setComposeModuleId(moduleId);
    setComposerMode("topic");
    setSelectedCellId(null);
    setAutoOpenAddSignal((n) => n + 1);
    setMobileSidebarOpen(false);
  };

  const handleAddContentToCourse = () => {
    handleSelectCourseOverview();
    setCourseContentAutoOpenSignal((n) => n + 1);
  };

  const handleAddContentToModule = (mod) => {
    handleSelectModule(mod);
    setModuleContentAutoOpenSignal((n) => n + 1);
  };

  const handleAddContentToLesson = (lesson, mod = null) => {
    handleSelectLesson(lesson.id);
    if (mod?.id) setComposeModuleId(mod.id);
    setLessonContentAutoOpenSignal((n) => n + 1);
  };

  const handleEntityCreated = ({ entity, parentId, moduleId, created, context }) => {
    if (!created?.id) return;
    if (entity === "module") {
      setComposeModuleId(created.id);
      setComposeLessonId(null);
      setComposeTopicId(null);
      setComposeSubTopicId(null);
      setComposeConceptId(null);
      setComposerMode("module");
    } else if (entity === "lesson") {
      setComposeModuleId(parentId);
      setComposeLessonId(created.id);
      setComposeTopicId(null);
      setComposeSubTopicId(null);
      setComposeConceptId(null);
      setComposerMode("lesson");
    } else if (entity === "topic") {
      if (moduleId) setComposeModuleId(moduleId);
      setComposeLessonId(parentId);
      setComposeTopicId(created.id);
      setComposeSubTopicId(null);
      setComposeConceptId(null);
      setComposerMode("topic");
      setAutoOpenAddSignal(0);
    } else if (entity === "subTopic") {
      handleSelectSubTopic({ ...created, topicId: created.topicId || parentId }, context || {});
    } else if (entity === "concept") {
      handleSelectConcept({ ...created, subTopicId: created.subTopicId || parentId }, context || {});
    }
  };

  const topicHierarchy = findHierarchyByTopicId(effectiveModules, composeTopicId);
  const lessonHierarchy = findModuleAndLessonById(effectiveModules, composeLessonId);

  const composingLesson = topicHierarchy.lesson || lessonHierarchy.lesson;
  const composingModule = topicHierarchy.module || lessonHierarchy.module;
  const activeModuleObj =
    effectiveModules.find((m) => String(m.id || m._id) === String(composeModuleId)) ||
    composingModule ||
    effectiveModules[0];
  const composingTopic = topicHierarchy.topic || composingLesson?.topics?.find((t) => String(t.id || t._id) === String(composeTopicId));
  const quizzesById = new Map();
  const extractAllQuizzesFromModuleList = (modList = []) => {
    const list = [];
    for (const m of modList || []) {
      if (!m) continue;
      if (Array.isArray(m.quizzes)) list.push(...m.quizzes);
      for (const l of m.lessons || []) {
        if (!l) continue;
        if (Array.isArray(l.quizzes)) list.push(...l.quizzes);
        for (const t of l.topics || []) {
          if (!t) continue;
          if (Array.isArray(t.quizzes)) list.push(...t.quizzes);
          if (t.quiz) list.push(t.quiz);
        }
      }
    }
    return list;
  };

  const allRawQuizzes = [
    ...(course?.quizzes || []),
    ...(effectiveCourseQuizzes || []),
    ...(draftQuizzes || []),
    ...extractAllQuizzesFromModuleList(modules),
    ...extractAllQuizzesFromModuleList(effectiveModules),
    ...extractAllQuizzesFromModuleList(draftModules),
    ...(selectedQuizState ? [selectedQuizState] : []),
  ];

  for (const q of allRawQuizzes) {
    if (!q) continue;
    const qKey = q.id ?? q._id;
    if (qKey !== undefined && qKey !== null) {
      quizzesById.set(String(qKey), q);
    }
  }

  const activeQuizObj = composeQuizId
    ? (quizzesById.get(String(composeQuizId)) || (selectedQuizState && (String(selectedQuizState.id) === String(composeQuizId) || String(selectedQuizState._id) === String(composeQuizId)) ? selectedQuizState : null))
    : null;

  // Every assignment the Composer can show, from whichever tree it is reading:
  // an import draft's lists, or — for a saved course — the course's own
  // assignments plus the ones on its modules, lessons and topics (GET /courses
  // and GET /modules both carry them now).
  const assignmentLists = isDraftMode
    ? [
        draftData?.canonicalJson?.assignments,
        ...draftModules.flatMap((m) => [
          m.assignments,
          ...(m.lessons || []).flatMap((l) => [l.assignments, ...(l.topics || []).map((t) => t.assignments)]),
        ]),
      ]
    : [
        course?.assignments,
        ...effectiveModules.flatMap((m) => [
          m.assignments,
          ...(m.lessons || []).flatMap((l) => [l.assignments, ...(l.topics || []).map((t) => t.assignments)]),
        ]),
      ];
  const activeAssignmentObj = composeAssignmentId
    ? assignmentLists.flatMap((list) => list || []).find((a) => String(a.id) === String(composeAssignmentId)) ||
      (String(selectedAssignmentState?.id) === String(composeAssignmentId) ? selectedAssignmentState : null)
    : null;

  // Applies `updateList` to whichever draft list holds the assignment, then
  // persists the draft like every other draft edit on this page.
  const updateDraftAssignments = (updateList) => {
    const nextModules = draftModules.map((m) => ({
      ...m,
      assignments: updateList(m.assignments || []),
      lessons: (m.lessons || []).map((l) => ({
        ...l,
        assignments: updateList(l.assignments || []),
        topics: (l.topics || []).map((t) => ({ ...t, assignments: updateList(t.assignments || []) })),
      })),
    }));
    const canonical = draftData?.canonicalJson || {};
    const updatedDraft = {
      ...draftData,
      modules: nextModules,
      canonicalJson: { ...canonical, assignments: updateList(canonical.assignments || []) },
    };
    setDraftModules(nextModules);
    setDraftData(updatedDraft);
    sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
  };

  const handleSaveDraftAssignment = (payload) => {
    const current = activeAssignmentObj;
    if (!current) return;
    // AssessmentForm edits the due date by day; keep the original time of day
    // when the day itself was left unchanged.
    const sameDay = current.dueDate && new Date(current.dueDate).toISOString().slice(0, 10) === payload.dueDate;
    const edited = {
      ...current,
      title: payload.title,
      description: payload.description,
      assessmentType: payload.assessmentType,
      marks: payload.marks,
      dueDate: sameDay ? current.dueDate : payload.dueDate,
      attachments: payload.attachments,
      isPublished: payload.isPublished,
    };
    updateDraftAssignments((list) => list.map((a) => (String(a.id) === String(current.id) ? edited : a)));
    showToast("Draft assignment updated locally!", "success", "Saved");
  };

  // Saved course: the same edit the draft path applies locally, through the
  // existing PUT /assignments/:id. That endpoint never moves a row between
  // levels, so the assignment keeps its place in its parent's sequence.
  const handleSaveAssignment = async (payload) => {
    const current = activeAssignmentObj;
    if (!current) return;
    const sameDay = current.dueDate && new Date(current.dueDate).toISOString().slice(0, 10) === payload.dueDate;
    try {
      await updateAssignmentMutation.mutateAsync({
        id: current.id,
        payload: {
          title: payload.title,
          description: payload.description || "",
          assessmentType: payload.assessmentType || null,
          marks: payload.marks,
          // Left out when the day itself did not change, so the original time
          // of day survives the edit.
          ...(sameDay ? {} : { dueDate: payload.dueDate }),
          totalQuestions: payload.totalQuestions,
          estimatedTime: payload.estimatedTime,
          resources: payload.resources,
          attachments: payload.attachments || [],
          isPublished: payload.isPublished !== false,
        },
      });
      showToast("Assignment updated!", "success", "Saved");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update assignment", "error");
    }
  };

  const handleDeleteAssignment = async (e, assignment) => {
    if (e) e.stopPropagation();
    if (!assignment || !window.confirm(`Are you sure you want to delete "${assignment.title || "this assignment"}"?`)) return;
    if (isDraftMode) {
      updateDraftAssignments((list) => list.filter((a) => String(a.id) !== String(assignment.id)));
    } else {
      try {
        await deleteAssignmentMutation.mutateAsync(assignment.id);
      } catch (err) {
        showToast(err?.response?.data?.message || "Failed to delete assignment", "error");
        return;
      }
    }
    if (composerMode === "assignment" && String(composeAssignmentId) === String(assignment.id)) {
      setComposerMode(
        composerModeForSelection({
          conceptId: composeConceptId,
          subTopicId: composeSubTopicId,
          topicId: composeTopicId,
          lessonId: composeLessonId,
          moduleId: composeModuleId,
        })
      );
      setComposeAssignmentId(null);
    }
    showToast(isDraftMode ? "Assignment removed from the draft" : "Assignment deleted", "success");
  };

  // Ids restored from the URL may name something that has since been deleted —
  // or that belongs to a different course, if a link was edited by hand. Once
  // the tree has actually loaded, anything that doesn't resolve is dropped and
  // the view falls back to the nearest parent that does, instead of rendering
  // an empty panel the instructor can't get out of. Guarded on the loading
  // flags so a slow fetch is never mistaken for a missing entity.
  const treeLoaded = !effectiveLoading;
  // Where the selected SubTopic's parent Topic sits in THIS course's tree —
  // empty when it isn't loaded yet or belongs to another course.
  const activeSubTopicParent = findHierarchyByTopicId(effectiveModules, activeSubTopic?.topicId);
  const activeSubTopicParentTopicId = activeSubTopicParent.topic?.id ?? null;
  const activeSubTopicParentLessonId = activeSubTopicParent.lesson?.id ?? null;
  const activeSubTopicParentModuleId = activeSubTopicParent.module?.id ?? null;
  useEffect(() => {
    if (!treeLoaded) return;

    if (composeQuizId && !activeQuizObj) {
      setComposeQuizId(null);
      if (composerMode === "quiz") {
        setComposerMode(
          composerModeForSelection({
            conceptId: composeConceptId,
            subTopicId: composeSubTopicId,
            topicId: composeTopicId,
            lessonId: composeLessonId,
            moduleId: composeModuleId,
          })
        );
      }
      return;
    }
    if (composeTopicId && !composingTopic) {
      setComposeTopicId(null);
      setComposeSubTopicId(null);
      setComposeConceptId(null);
      setSelectedCellId(null);
      if (composerMode === "topic" || composerMode === "subTopic" || composerMode === "concept") {
        setComposerMode(composingLesson ? "lesson" : "course");
      }
      return;
    }
    if (composeLessonId && !composingLesson) {
      setComposeLessonId(null);
      if (composerMode === "lesson") setComposerMode(activeModuleObj ? "module" : "course");
      return;
    }

    // SubTopic/Concept are loaded by id on demand, not with the modules tree.
    // "Not loaded yet" must never be read as "doesn't exist": wait for the
    // query to settle before judging a ?concept= or ?subTopic= id.
    if (composeConceptId) {
      if (conceptQuery.isLoading) return;
      if (!activeConcept) {
        setComposeConceptId(null);
        setSelectedCellId(null);
        if (composerMode === "concept") setComposerMode(composeSubTopicId ? "subTopic" : composeTopicId ? "topic" : "course");
        return;
      }
      if (!composeSubTopicId) {
        // A link (or a quiz) that named only the Concept — adopt its SubTopic.
        setComposeSubTopicId(activeConcept.subTopicId);
        return;
      }
      if (String(activeConcept.subTopicId) !== String(composeSubTopicId)) {
        setComposeConceptId(null);
        setSelectedCellId(null);
        if (composerMode === "concept") setComposerMode("subTopic");
        return;
      }
    }
    if (composeSubTopicId) {
      if (subTopicQuery.isLoading) return;
      const belongsToSelection =
        activeSubTopic &&
        activeSubTopicParentTopicId &&
        (!composeTopicId || String(activeSubTopic.topicId) === String(composeTopicId));
      if (!belongsToSelection) {
        setComposeSubTopicId(null);
        setComposeConceptId(null);
        setSelectedCellId(null);
        if (composerMode === "subTopic" || composerMode === "concept") {
          setComposerMode(composeTopicId ? "topic" : composingLesson ? "lesson" : "course");
        }
        return;
      }
      if (!composeTopicId) {
        // Adopt the SubTopic's real parents so the Course Map expands to it.
        setComposeTopicId(activeSubTopicParentTopicId);
        setComposeLessonId(activeSubTopicParentLessonId);
        setComposeModuleId(activeSubTopicParentModuleId);
        return;
      }
    }

    // The Topic tree carries no SubTopic/Concept contents, so this check only
    // applies while a Topic (not one of its SubTopics/Concepts) is selected.
    if (
      selectedCellId &&
      !composeSubTopicId &&
      composingTopic &&
      !(composingTopic.contents || []).some((c) => String(c.id || c._id) === String(selectedCellId))
    ) {
      setSelectedCellId(null);
    }
  }, [
    treeLoaded,
    composerMode,
    composeQuizId,
    activeQuizObj,
    composeTopicId,
    composingTopic,
    composeLessonId,
    composingLesson,
    composeModuleId,
    activeModuleObj,
    selectedCellId,
    composeSubTopicId,
    composeConceptId,
    subTopicQuery.isLoading,
    conceptQuery.isLoading,
    activeSubTopic,
    activeConcept,
    activeSubTopicParentTopicId,
    activeSubTopicParentLessonId,
    activeSubTopicParentModuleId,
  ]);

  // Delete Handlers for structural children
  const handleDeleteModule = async (e, mod) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this module and all its contents?")) return;
    if (isDraftMode) {
      const deletedLessonIds = new Set((mod.lessons || []).map((l) => l.id));
      const deletedTopicIds = new Set((mod.lessons || []).flatMap((l) => (l.topics || []).map((t) => t.id)));
      const nextMods = draftModules.filter((m) => m.id !== mod.id);
      const nextQuizzes = draftQuizzes.filter(
        (q) => q.moduleId !== mod.id && (!q.lessonId || !deletedLessonIds.has(q.lessonId)) && (!q.topicId || !deletedTopicIds.has(q.topicId))
      );
      setDraftModules(nextMods);
      setDraftQuizzes(nextQuizzes);
      showToast("Module deleted from draft", "success");
      handleSelectCourseOverview();
      return;
    }
    try {
      await deleteModuleMutation.mutateAsync(mod.id);
      showToast("Module deleted successfully", "success");
      handleSelectCourseOverview();
    } catch (err) {
      showToast("Failed to delete module", "error");
    }
  };

  const handleDeleteLesson = async (e, lesson, moduleId) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    if (isDraftMode) {
      const deletedTopicIds = new Set((lesson.topics || []).map((t) => t.id));
      const nextMods = draftModules.map((m) => {
        if (m.id === moduleId || (m.lessons || []).some((l) => l.id === lesson.id)) {
          return {
            ...m,
            lessons: (m.lessons || []).filter((l) => l.id !== lesson.id)
          };
        }
        return m;
      });
      const nextQuizzes = draftQuizzes.filter(
        (q) => q.lessonId !== lesson.id && (!q.topicId || !deletedTopicIds.has(q.topicId))
      );
      setDraftModules(nextMods);
      setDraftQuizzes(nextQuizzes);
      showToast("Lesson deleted from draft", "success");
      handleSelectCourseOverview();
      return;
    }
    try {
      await deleteLessonMutation.mutateAsync({ lessonId: lesson.id, moduleId });
      showToast("Lesson deleted successfully", "success");
      handleSelectCourseOverview();
    } catch (err) {
      showToast("Failed to delete lesson", "error");
    }
  };

  const handleDeleteTopic = async (e, topic, lessonId) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this topic and all its contents?")) return;
    if (isDraftMode) {
      const nextMods = draftModules.map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((l) => {
          if (l.id === lessonId || (l.topics || []).some((t) => t.id === topic.id)) {
            return {
              ...l,
              topics: (l.topics || []).filter((t) => t.id !== topic.id)
            };
          }
          return l;
        })
      }));
      const nextQuizzes = draftQuizzes.filter((q) => q.topicId !== topic.id);
      setDraftModules(nextMods);
      setDraftQuizzes(nextQuizzes);
      showToast("Topic deleted from draft", "success");
      if (composeTopicId === topic.id) {
        setComposeTopicId(null);
        setComposerMode("lesson");
      }
      return;
    }
    try {
      await deleteTopicMutation.mutateAsync({ topicId: topic.id, lessonId });
      showToast("Topic deleted successfully", "success");
      if (composeTopicId === topic.id) {
        setComposeTopicId(null);
        setComposeSubTopicId(null);
        setComposeConceptId(null);
        setComposerMode("lesson");
      }
    } catch (err) {
      showToast("Failed to delete topic", "error");
    }
  };

  const handleDeleteContent = async (e, content, topicId) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this content?")) return;
    if (isDraftMode) {
      const nextMods = draftModules.map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((l) => ({
          ...l,
          topics: (l.topics || []).map((t) => {
            if (t.id === topicId || (t.contents || []).some((c) => c.id === content.id)) {
              return {
                ...t,
                contents: (t.contents || []).filter((c) => c.id !== content.id)
              };
            }
            return t;
          })
        }))
      }));
      setDraftModules(nextMods);
      showToast("Content deleted from draft", "success");
      if (selectedCellId === content.id) setSelectedCellId(null);
      return;
    }
    try {
      await deleteContentMutation.mutateAsync({ contentId: content.id, topicId });
      showToast("Content deleted successfully", "success");
      if (selectedCellId === content.id) setSelectedCellId(null);
    } catch (err) {
      showToast("Failed to delete content", "error");
    }
  };

  // Course/Module/Lesson-level content cells are hidden while isDraftMode
  // is true (see CourseOverviewView/ModuleOverviewView/LessonOverviewView),
  // so these three sidebar handlers only ever need the live-API path —
  // unlike handleDeleteContent above, no draftModules branch is needed.
  const handleDeleteContentAtParent = async (e, content, parent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this content?")) return;
    try {
      await deleteContentMutation.mutateAsync({ contentId: content.id, parent });
      showToast("Content deleted successfully", "success");
      if (selectedCellId === content.id) setSelectedCellId(null);
    } catch (err) {
      showToast("Failed to delete content", "error");
    }
  };

  // The backend deletes a SubTopic together with its Concepts and every
  // Content/Quiz under both; a Concept together with its Content/Quizzes.
  const handleDeleteSubTopic = async (e, subTopic, context = {}) => {
    if (e) e.stopPropagation();
    if (
      !window.confirm(
        `Delete "${subTopic.title || "this subtopic"}"? Its concepts, contents and quizzes will be deleted too.`
      )
    )
      return;
    try {
      await deleteSubTopicMutation.mutateAsync({
        subTopicId: subTopic.id,
        topicId: subTopic.topicId || context.topic?.id,
      });
      showToast("SubTopic deleted successfully", "success");
      if (composeSubTopicId === subTopic.id) {
        setComposeSubTopicId(null);
        setComposeConceptId(null);
        setSelectedCellId(null);
        if (composerMode === "subTopic" || composerMode === "concept") setComposerMode("topic");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete subtopic", "error");
    }
  };

  const handleDeleteConcept = async (e, concept, context = {}) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${concept.title || "this concept"}"? Its contents and quizzes will be deleted too.`)) return;
    try {
      await deleteConceptMutation.mutateAsync({
        conceptId: concept.id,
        subTopicId: concept.subTopicId || context.subTopic?.id,
      });
      showToast("Concept deleted successfully", "success");
      if (composeConceptId === concept.id) {
        setComposeConceptId(null);
        setSelectedCellId(null);
        if (composerMode === "concept") setComposerMode("subTopic");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete concept", "error");
    }
  };

  const handleDeleteSubTopicContent = (e, content, context = {}) =>
    handleDeleteContentAtParent(e, content, { parentType: "subTopic", parentId: context.subTopic?.id || content.subTopicId });
  const handleDeleteConceptContent = (e, content, context = {}) =>
    handleDeleteContentAtParent(e, content, { parentType: "concept", parentId: context.concept?.id || content.conceptId });

  const handleDeleteCourseContent = (e, content) =>
    handleDeleteContentAtParent(e, content, { parentType: "course", parentId: courseId });
  const handleDeleteModuleContent = (e, content, mod) =>
    handleDeleteContentAtParent(e, content, { parentType: "module", parentId: mod.id });
  const handleDeleteLessonContent = (e, content, lesson) =>
    handleDeleteContentAtParent(e, content, { parentType: "lesson", parentId: lesson.id });

  const handleSelectCourseContent = (content) => {
    handleSelectCourseOverview();
    setSelectedCellId(content.id);
  };
  const handleSelectModuleContent = (content, mod) => {
    handleSelectModule(mod);
    setSelectedCellId(content.id);
  };
  const handleSelectLessonContent = (content, lesson, mod) => {
    handleSelectLesson(lesson.id);
    if (mod?.id) setComposeModuleId(mod.id);
    setSelectedCellId(content.id);
  };

  // SubTopic / Concept selection. The Course Map passes the row plus its
  // parent chain ({ module, lesson, topic[, subTopic] }); every ancestor id is
  // kept selected so the tree stays expanded down to the row.
  const handleSelectSubTopic = (subTopic, context = {}) => {
    if (!subTopic?.id) return;
    rememberNodeTitle(subTopic);
    setComposeModuleId(context.module?.id || composeModuleId || null);
    setComposeLessonId(context.lesson?.id || composeLessonId || null);
    setComposeTopicId(context.topic?.id || subTopic.topicId || composeTopicId || null);
    setComposeSubTopicId(subTopic.id);
    setComposeConceptId(null);
    setComposeQuizId(null);
    setComposerMode("subTopic");
    setSelectedCellId(null);
    // Same stale-auto-open guard as handleSelectTopic.
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  const handleSelectConcept = (concept, context = {}) => {
    if (!concept?.id) return;
    rememberNodeTitle(context.subTopic);
    rememberNodeTitle(concept);
    setComposeModuleId(context.module?.id || composeModuleId || null);
    setComposeLessonId(context.lesson?.id || composeLessonId || null);
    setComposeTopicId(context.topic?.id || composeTopicId || null);
    setComposeSubTopicId(context.subTopic?.id || concept.subTopicId || composeSubTopicId || null);
    setComposeConceptId(concept.id);
    setComposeQuizId(null);
    setComposerMode("concept");
    setSelectedCellId(null);
    setAutoOpenAddSignal(0);
    setMobileSidebarOpen(false);
  };

  const handleSelectSubTopicContent = (content, context = {}) => {
    handleSelectSubTopic(context.subTopic, context);
    setSelectedCellId(content.id);
  };

  const handleSelectConceptContent = (content, context = {}) => {
    handleSelectConcept(context.concept, context);
    setSelectedCellId(content.id);
  };

  const handleAddContentToSubTopic = (subTopic, context = {}) => {
    handleSelectSubTopic(subTopic, context);
    setAutoOpenAddSignal((n) => n + 1);
  };

  const handleAddContentToConcept = (concept, context = {}) => {
    handleSelectConcept(concept, context);
    setAutoOpenAddSignal((n) => n + 1);
  };

  const handleSaveCourse = async () => {
    if (isDraftMode) {
      if (!draftData || !draftData.jobId) {
        showToast("No active course draft found to save.", "error");
        return;
      }
      setIsSavingDraft(true);
      try {
        const updatedCanonicalJson = {
          ...(draftData.canonicalJson || {}),
          metadata: {
            ...(draftData.canonicalJson?.metadata || {}),
            title: courseForm.title || draftData.metadata?.title || "Imported Course",
            description: courseForm.description || draftData.metadata?.description || "",
            category: courseForm.category || draftData.metadata?.category || "General",
            level: courseForm.level || draftData.metadata?.level || "BEGINNER",
            thumbnailUrl: courseForm.thumbnailUrl || draftData.metadata?.thumbnailUrl || null,
          },
          settings: draftData.settings || {},
          quizzes: draftQuizzes.length > 0 ? draftQuizzes : (draftData.quizzes || draftData.canonicalJson?.quizzes || []),
          modules: draftModules,
          assetMap: draftData.assetMap || {}
        };

        const response = await api.post(`/course-import/jobs/${draftData.jobId}/import`, {
          canonicalJson: updatedCanonicalJson
        });

        const createdCourse = response.data?.data;
        const persistedCourseId = createdCourse?.courseId || createdCourse?.id;

        if (!persistedCourseId) {
          throw new Error("Failed to save course: No course ID returned.");
        }

        sessionStorage.removeItem("imported_course_draft");
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] });
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES_TABLE] });
        await queryClient.resetQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES_TABLE] });

        showToast("Course saved and created successfully!", "success", "Saved");
        router.push(`/instructor/courses/${persistedCourseId}`);
      } catch (err) {
        console.error("Save Draft Error:", err);
        const msg = err?.response?.data?.message || err?.message || "Failed to save course to database.";
        showToast(msg, "error");
      } finally {
        setIsSavingDraft(false);
      }
    } else {
      try {
        await updateCourseMutation.mutateAsync({ courseId, courseData: courseForm });
        showToast("Course saved successfully!", "success", "Saved");
      } catch (err) {
        showToast("Failed to save course", "error");
      }
    }
  };

  // --- LIFECYCLE ACTION HANDLERS ---

  const handleConfirmPublish = async () => {
    try {
      await publishCourseMutation.mutateAsync(courseId);
      showToast("Course published successfully!", "success", "Published");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to publish course";
      showToast(msg, "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 2. Unpublish Modal & Handler
  const handleOpenUnpublishModal = () => {
    setUnpublishModalOpen(true);
  };

  const handleConfirmUnpublish = async () => {
    try {
      await unpublishCourseMutation.mutateAsync(courseId);
      setUnpublishModalOpen(false);
      showToast("Course unpublished (set to DRAFT)", "success", "Unpublished");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to unpublish course";
      showToast(msg, "error");
    }
  };

  // 3. Delete Modal & Handler
  const handleOpenDeleteModal = () => {
    setDeleteHasStudentData(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteCourse = async () => {
    try {
      if (isDraftMode || courseId === "draft") {
        sessionStorage.removeItem("imported_course_draft");
        setDeleteModalOpen(false);
        showToast("Course draft discarded successfully", "info");
        router.push("/instructor/courses");
        return;
      }
      await deleteCourseMutation.mutateAsync(courseId);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES] });
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES_TABLE] });
      await queryClient.resetQueries({ queryKey: [QUERY_KEYS.INSTRUCTOR_COURSES_TABLE] });
      setDeleteModalOpen(false);
      showToast("Course deleted successfully", "success");
      router.push("/instructor/courses");
    } catch (err) {
      const errRes = err?.response?.data;
      if (errRes?.code === "COURSE_HAS_STUDENT_DATA" || errRes?.hasStudentData) {
        setDeleteHasStudentData(true);
      } else {
        const msg = errRes?.message || err?.message || "Failed to delete course";
        showToast(msg, "error");
      }
    }
  };

  // 4. Archive Handler
  const handleConfirmArchiveCourse = async () => {
    try {
      await archiveCourseMutation.mutateAsync(courseId);
      setDeleteModalOpen(false);
      showToast("Course archived successfully", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to archive course";
      showToast(msg, "error");
    }
  };

  // 5. Restore Handler
  const handleConfirmRestoreCourse = async () => {
    try {
      await restoreCourseMutation.mutateAsync(courseId);
      showToast("Course restored to DRAFT successfully", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to restore course";
      showToast(msg, "error");
    }
  };

  // 6. Duplicate Handler
  const handleDuplicateCourse = async () => {
    try {
      const res = await duplicateCourse(courseId);
      const newCourse = res?.data || res;
      showToast("Course duplicated successfully!", "success");
      if (newCourse?.id) {
        router.push(`/instructor/courses/${newCourse.id}`);
      }
    } catch (err) {
      showToast("Failed to duplicate course", "error");
    }
  };

  if (effectiveLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader />
      </div>
    );
  }

  if (effectiveError || !effectiveCourse) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 text-center bg-card border border-border rounded-2xl space-y-4">
        <h2 className="text-xl font-bold text-foreground">Course Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested course could not be loaded.
        </p>
        <Link
          href="/instructor/courses"
          className="inline-block px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 text-xs font-black transition"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  const isPublished = effectiveCourse.status === "PUBLISHED";

  const courseMapEffectivelyOpen = mobileSidebarOpen || isCourseMapOpen;

  // On mobile the Course Map is an overlay drawer sitting on top of the
  // workspace. Anything that changes what the workspace shows has to dismiss
  // it, or the selection lands behind the drawer and reads as a dead tap.
  // Actions that open a modal are deliberately not wrapped: Modal renders at
  // z-9999, well above the drawer, and staying in the tree is the right
  // behaviour when adding or renaming a sibling.
  const closingDrawer = (fn) => (...args) => {
    setMobileSidebarOpen(false);
    return fn?.(...args);
  };
  const sidebarWrapperClassName = mobileSidebarOpen
    ? "fixed inset-y-0 left-0 z-50 w-80 bg-background pt-4 pr-4 pb-4 pl-[1.6px] shadow-2xl block shrink-0 overflow-y-auto"
    : `hidden lg:block shrink-0 lg:h-full transition-[width] duration-300 ease-in-out ${
        isCourseMapOpen ? "w-full lg:w-[320px]" : "w-full lg:w-0"
      }`;

  return (
    // The instructor layout gives the Composer route its own bounded-height
    // shell (see instructor/layout.jsx's isCourseComposerPage branch) instead
    // of DashboardLayout's normal ever-growing, p-16/pb-32-padded `main` — so
    // this fills that shell rather than pulling back padding that isn't
    // there any more. flex-col + min-h-0 lets the Notebook cell stack below
    // become the one scrollable region instead of the whole page.
    <div className="h-full flex flex-col animate-fade-in duration-300">
      {/* 1. APP HEADER — no visible bar now; just the mobile Course Map
          toggle (floating) and Ask OTree AI (floating). Status and the
          Publish/Unpublish/Restore/Save actions live on the Course Header
          cell below. */}
      <CourseComposerHeader
        onOpenAskAi={() => handleOpenAskAi()}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="relative flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* Drawer backdrop — sits under the drawer (z-50) and over everything
            else, so a tap outside dismisses instead of falling through to the
            workspace. lg:hidden keeps it away from the desktop rail entirely. */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar Panel */}
        <div className={sidebarWrapperClassName}>
          <CourseComposerSidebar
            maxHeightClassName="max-h-full"
            modules={effectiveModules}
            courseQuizzes={effectiveCourseQuizzes}
            // An import draft can carry content and assignments on the course
            // itself (and on modules/lessons, which travel inside effectiveModules).
            courseContents={isDraftMode ? draftData?.canonicalJson?.contents : undefined}
            courseAssignments={isDraftMode ? draftData?.canonicalJson?.assignments || [] : course?.assignments || []}
            composeAssignmentId={composeAssignmentId}
            onSelectAssignment={closingDrawer(handleSelectAssignment)}
            onDeleteAssignment={handleDeleteAssignment}
            onAddAssignmentToCourse={isDraftMode ? undefined : () => setAssignmentModalOpen(true)}
            composerMode={composerMode}
            composeModuleId={composeModuleId}
            composeLessonId={composeLessonId}
            composeTopicId={composeTopicId}
            composeSubTopicId={composeSubTopicId}
            composeConceptId={composeConceptId}
            composeQuizId={composeQuizId}
            selectedCellId={selectedCellId}
            isOpen={courseMapEffectivelyOpen}
            onToggleOpen={() => {
              // The mobile drawer and the desktop rail are separate things.
              // Doing both left the desktop map collapsed after a mobile
              // dismiss, which looked like the map had vanished.
              if (mobileSidebarOpen) setMobileSidebarOpen(false);
              else setIsCourseMapOpen((v) => !v);
            }}
            onSelectCourseOverview={closingDrawer(handleSelectCourseOverview)}
            onSelectQuiz={closingDrawer(handleSelectQuiz)}
            onDuplicateQuiz={handleDuplicateQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onSelectLesson={closingDrawer(handleSelectLesson)}
            onSelectModule={closingDrawer(handleSelectModule)}
            onSelectTopic={closingDrawer(handleSelectTopic)}
            onSelectContent={closingDrawer(handleSelectContent)}
            onSelectCourseContent={closingDrawer(handleSelectCourseContent)}
            onSelectModuleContent={closingDrawer(handleSelectModuleContent)}
            onSelectLessonContent={closingDrawer(handleSelectLessonContent)}
            onDeleteCourseContent={handleDeleteCourseContent}
            onDeleteModuleContent={handleDeleteModuleContent}
            onDeleteLessonContent={handleDeleteLessonContent}
            courseId={courseId}
            onAddModule={() => openEntityModal({ entity: "module", mode: "create", courseId })}
            onEditModule={(mod) => openEntityModal({ entity: "module", mode: "edit", entityData: mod })}
            onAddLesson={(targetModuleId) =>
              openEntityModal({ entity: "lesson", mode: "create", parentId: targetModuleId || composeModuleId || modules[0]?.id })
            }
            onAddQuizToCourse={closingDrawer(handleAddCourseQuiz)}
            onAddQuizToModule={closingDrawer(handleAddModuleQuiz)}
            onAddQuizToLesson={closingDrawer(handleAddLessonQuiz)}
            onAddQuizToTopic={closingDrawer(handleAddTopicQuiz)}
            onEditLesson={(lesson, moduleId) => openEntityModal({ entity: "lesson", mode: "edit", entityData: lesson, parentId: moduleId })}
            onAddTopic={(lessonId) => openEntityModal({ entity: "topic", mode: "create", parentId: lessonId })}
            onEditTopic={(topic, lessonId, moduleId) =>
              openEntityModal({ entity: "topic", mode: "edit", entityData: topic, parentId: lessonId, moduleId })
            }
            onAddContentToTopic={handleAddContentFromSidebar}
            onAddContentToCourse={handleAddContentToCourse}
            onAddContentToModule={handleAddContentToModule}
            onAddContentToLesson={handleAddContentToLesson}
            onDeleteLesson={handleDeleteLesson}
            onDeleteModule={handleDeleteModule}
            onDeleteTopic={handleDeleteTopic}
            onDeleteContent={handleDeleteContent}
            // SubTopic / Concept. GET /modules stops at Topic, so the map
            // loads them per expanded row and places their quizzes from the
            // course-wide list. Import drafts are Topic-only: no lazy loading.
            loadChildrenLazily={!isDraftMode}
            quizPool={isDraftMode ? [] : course?.quizzes || []}
            onSelectSubTopic={closingDrawer(handleSelectSubTopic)}
            onSelectConcept={closingDrawer(handleSelectConcept)}
            onSelectSubTopicContent={closingDrawer(handleSelectSubTopicContent)}
            onSelectConceptContent={closingDrawer(handleSelectConceptContent)}
            onDeleteSubTopicContent={handleDeleteSubTopicContent}
            onDeleteConceptContent={handleDeleteConceptContent}
            onAddSubTopic={(topic, context) =>
              openEntityModal({ entity: "subTopic", mode: "create", parentId: topic.id, context: { ...context, topic } })
            }
            onEditSubTopic={(subTopic, context) =>
              openEntityModal({
                entity: "subTopic",
                mode: "edit",
                entityData: subTopic,
                parentId: subTopic.topicId || context?.topic?.id,
                context,
              })
            }
            onDeleteSubTopic={handleDeleteSubTopic}
            onAddConcept={(subTopic, context) =>
              openEntityModal({ entity: "concept", mode: "create", parentId: subTopic.id, context: { ...context, subTopic } })
            }
            onEditConcept={(concept, context) =>
              openEntityModal({
                entity: "concept",
                mode: "edit",
                entityData: concept,
                parentId: concept.subTopicId || context?.subTopic?.id,
                context,
              })
            }
            onDeleteConcept={handleDeleteConcept}
            onAddContentToSubTopic={closingDrawer(handleAddContentToSubTopic)}
            onAddContentToConcept={closingDrawer(handleAddContentToConcept)}
            onAddQuizToSubTopic={closingDrawer(handleAddSubTopicQuiz)}
            onAddQuizToConcept={closingDrawer(handleAddConceptQuiz)}
            isDraftMode={isDraftMode}
          />
        </div>

        {/* Center Main Workspace Notebook Area — flex-col so only the cell
            stack below scrolls, not this whole column (the reopen button
            above it stays put, same as the Course Map beside it). */}
        <main className="flex-1 min-w-0 w-full flex flex-col min-h-0">
          {/* Workspace Header — breadcrumb/title text removed (each view
              already shows its own title further down: the Course Header
              cell, the lesson/module/topic composer, the quiz form). The
              "reopen Course Map" control survives since it's the only way
              back once the rail is collapsed on desktop. */}
          {!isCourseMapOpen && !mobileSidebarOpen && (
            <div className="flex items-center pb-3 border-b border-transparent/80 shrink-0">
              <button
                type="button"
                onClick={() => setIsCourseMapOpen(true)}
                className="hidden lg:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-background text-primary shadow-md transition hover:bg-primary/10 hover:border-primary hover:text-orange-300 cursor-pointer"
                aria-label="Show course map"
                title="Show course map"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}

          {/* Notebook Workspace Dynamic View — the one scrollable region in
              this page now; everything else (navbar, Course Map, this
              reopen button) stays fixed in place while these cells scroll. */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-transparent bg-background/60 p-2 sm:p-6 shadow-xl">
            {composerMode === "course" && (
              <CourseOverviewView
                course={effectiveCourse}
                courseForm={courseForm}
                setCourseForm={setCourseForm}
                isEditing={isEditingCourse}
                setIsEditing={setIsEditingCourse}
                onSaveCourseMeta={async () => {
                  if (isDraftMode) {
                    setIsEditingCourse(false);
                    showToast("Draft course details updated locally!", "success", "Saved");
                  } else {
                    try {
                      await updateCourseMutation.mutateAsync({ courseId, courseData: courseForm });
                      setIsEditingCourse(false);
                      showToast("Course details updated!", "success", "Saved");
                    } catch (err) {
                      showToast("Failed to save course", "error");
                    }
                  }
                }}
                isSaving={isDraftMode ? isSavingDraft : updateCourseMutation.isPending}
                modules={effectiveModules}
                onSelectModule={handleSelectModule}
                onSelectQuiz={handleSelectQuiz}
                // Course-level quizzes are always appended — the backend keeps
                // every course quiz after all course content, assignments and
                // modules — so the "Add Quiz here" position is deliberately
                // dropped here instead of asking for a slot that can't exist.
                onAddQuiz={() => handleAddCourseQuiz()}
                onAddModule={() => openEntityModal({ entity: "module", mode: "create", courseId })}
                isDraftMode={isDraftMode}
                contentAutoOpenSignal={courseContentAutoOpenSignal}
                onContentAutoOpenConsumed={() => setCourseContentAutoOpenSignal(0)}
                onPublishClick={handleConfirmPublish}
                onUnpublishClick={handleOpenUnpublishModal}
                onRestoreClick={handleConfirmRestoreCourse}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveCourse={handleSaveCourse}
                isSavingCourse={isDraftMode ? isSavingDraft : updateCourseMutation.isPending}
              />
            )}

            {composerMode === "quiz" && (
              <QuizOverviewView
                key={composeQuizId || `new-quiz-${composeConceptId || composeSubTopicId || composeTopicId || composeLessonId || composeModuleId || "course"}`}
                quiz={activeQuizObj}
                quizMode={quizMode}
                courseId={courseId}
                moduleTitle={activeModuleObj?.title}
                lessonTitle={composeLessonId ? composingLesson?.title : null}
                topicTitle={composeTopicId ? composingTopic?.title : null}
                subTopicTitle={composingSubTopicTitle}
                conceptTitle={composingConceptTitle}
                onSaveQuiz={handleSaveQuiz}
                onCancel={handleCancelQuizEdit}
                startEditing={quizStartEditing}
              />
            )}

            {composerMode === "assignment" && (
              <AssignmentOverviewView
                key={`${composeAssignmentId}-${assignmentStartEditing}`}
                assignment={activeAssignmentObj}
                scopeLabel={
                  composeTopicId ? `Topic Assignment — ${composingTopic?.title || ""}`
                    : composeLessonId ? `Lesson Assignment — ${composingLesson?.title || ""}`
                    : composeModuleId ? `Module Assignment — ${activeModuleObj?.title || ""}`
                    : "Course-Level Assignment"
                }
                startEditing={assignmentStartEditing}
                onSave={isDraftMode ? handleSaveDraftAssignment : handleSaveAssignment}
                onDelete={() => handleDeleteAssignment(null, activeAssignmentObj)}
              />
            )}

            {composerMode === "lesson" && (
              <LessonOverviewView
                lesson={composingLesson}
                lessonForm={lessonForm}
                setLessonForm={setLessonForm}
                isEditing={isEditingLesson}
                setIsEditing={setIsEditingLesson}
                onSaveLessonMeta={async () => {
                  if (isDraftMode) {
                    setIsEditingLesson(false);
                    showToast("Draft lesson details updated locally!", "success", "Saved");
                  } else {
                    try {
                      await updateLessonMutation.mutateAsync({
                        lessonId: composeLessonId,
                        lessonData: { ...lessonForm, moduleId: composeModuleId },
                      });
                      setIsEditingLesson(false);
                      showToast("Lesson updated!", "success", "Saved");
                    } catch (err) {
                      showToast("Failed to save lesson", "error");
                    }
                  }
                }}
                isSaving={isDraftMode ? isSavingDraft : updateLessonMutation.isPending}
                topics={composingLesson?.topics || []}
                onSelectTopic={handleSelectTopic}
                onAddTopic={() => openEntityModal({ entity: "topic", mode: "create", parentId: composeLessonId, moduleId: composeModuleId })}
                onAddContentToTopic={handleAddContentFromSidebar}
                onEditTopic={(topic) => openEntityModal({ entity: "topic", mode: "edit", entityId: topic.id, initialData: topic, parentId: composeLessonId, moduleId: composeModuleId })}
                onDeleteTopic={(e, topic, lId) => handleDeleteTopic(e, topic, lId || composeLessonId)}
                parentModule={activeModuleObj}
                onSelectLesson={handleSelectLesson}
                isDraftMode={isDraftMode}
                contentAutoOpenSignal={lessonContentAutoOpenSignal}
                onContentAutoOpenConsumed={() => setLessonContentAutoOpenSignal(0)}
                onAddQuiz={(order) => handleAddLessonQuiz(composingLesson, composingModule, order)}
              />
            )}

            {composerMode === "module" && activeModuleObj && (
              <ModuleOverviewView
                module={activeModuleObj}
                onSelectLesson={handleSelectLesson}
                onAddLesson={(modId) => openEntityModal({ entity: "lesson", mode: "create", parentId: modId })}
                onEditModule={(mod) => openEntityModal({ entity: "module", mode: "edit", entityData: mod, courseId })}
                onEditLesson={(les) => openEntityModal({ entity: "lesson", mode: "edit", entityData: les, parentId: activeModuleObj.id })}
                onAddTopic={(lesId) => openEntityModal({ entity: "topic", mode: "create", parentId: lesId, moduleId: activeModuleObj.id })}
                onDeleteLesson={handleDeleteLesson}
                allModules={effectiveModules}
                onSelectModule={handleSelectModule}
                isDraftMode={isDraftMode}
                contentAutoOpenSignal={moduleContentAutoOpenSignal}
                onContentAutoOpenConsumed={() => setModuleContentAutoOpenSignal(0)}
                onAddQuiz={(order) => handleAddModuleQuiz(activeModuleObj, order)}
              />
            )}

            {composerMode === "topic" && (
              <LessonComposerPanel
                parent={{ parentType: "topic", parentId: composeTopicId }}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
                autoOpenAddSignal={autoOpenAddSignal}
                onAutoOpenConsumed={() => setAutoOpenAddSignal(0)}
                onAddQuiz={composingTopic ? (order) => handleAddTopicQuiz(composingTopic, composingLesson, composingModule, order) : undefined}
                draftContents={isDraftMode ? composingTopic?.contents || [] : undefined}
                isDraftMode={isDraftMode}
                onUpdateDraftContents={(newContents) => {
                  if (!isDraftMode || !composeTopicId) return;
                  const nextDraftModules = draftModules.map((m) => ({
                    ...m,
                    lessons: (m.lessons || []).map((l) => ({
                      ...l,
                      topics: (l.topics || []).map((t) =>
                        t.id === composeTopicId ? { ...t, contents: newContents } : t
                      ),
                    })),
                  }));
                  setDraftModules(nextDraftModules);
                  if (draftData) {
                    const updatedDraft = { ...draftData, modules: nextDraftModules };
                    setDraftData(updatedDraft);
                    sessionStorage.setItem("imported_course_draft", JSON.stringify(updatedDraft));
                  }
                }}
              />
            )}

            {composerMode === "subTopic" && !isDraftMode && (
              <LessonComposerPanel
                parent={{ parentType: "subTopic", parentId: composeSubTopicId }}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
                autoOpenAddSignal={autoOpenAddSignal}
                onAutoOpenConsumed={() => setAutoOpenAddSignal(0)}
                onAddQuiz={(order) =>
                  handleAddSubTopicQuiz({ id: composeSubTopicId, title: composingSubTopicTitle }, {}, order)
                }
              />
            )}

            {composerMode === "concept" && !isDraftMode && (
              <LessonComposerPanel
                parent={{ parentType: "concept", parentId: composeConceptId }}
                selectedCellId={selectedCellId}
                onSelectCell={setSelectedCellId}
                autoOpenAddSignal={autoOpenAddSignal}
                onAutoOpenConsumed={() => setAutoOpenAddSignal(0)}
                onAddQuiz={(order) =>
                  handleAddConceptQuiz({ id: composeConceptId, title: composingConceptTitle }, {}, order)
                }
              />
            )}
          </div>
        </main>
      </div>

      {/* Module/Lesson/Topic create+edit modal */}
      <EntityFormModal
        state={entityModalState}
        onClose={closeEntityModal}
        onCreated={handleEntityCreated}
      />

      {/* Course-level Assignment (the real entity, placed after every Module). */}
      <AssignmentFormModal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        courseId={courseId}
        onCreated={(assignment) => handleSelectAssignment(assignment)}
      />

      {/* Unpublish Confirmation Modal */}
      <UnpublishModal
        isOpen={unpublishModalOpen}
        onClose={() => setUnpublishModalOpen(false)}
        onUnpublish={handleConfirmUnpublish}
        isUnpublishing={unpublishCourseMutation.isPending}
        courseTitle={effectiveCourse?.title}
      />

      {/* Delete / Archive Safety Modal */}
      <DeleteCourseModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDeleteCourse}
        onConfirmArchive={handleConfirmArchiveCourse}
        isDeleting={deleteCourseMutation.isPending}
        isArchiving={archiveCourseMutation.isPending}
        courseTitle={effectiveCourse?.title}
        hasStudentData={deleteHasStudentData}
        isPublished={isPublished}
      />

      {/* Unified Ask OTree AI Assistant Modal */}
      <AiComposerModal
        isOpen={askAiModalOpen}
        onClose={() => setAskAiModalOpen(false)}
        initialScope={askAiScope}
        contextData={askAiContext}
        onApply={handleApplyAiGeneratedData}
      />
    </div>
  );
}
