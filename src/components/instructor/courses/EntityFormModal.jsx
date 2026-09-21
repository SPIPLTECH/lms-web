"use client";

import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

import ModuleForm from "@/components/instructor/modules/ModuleForm";
import LessonForm from "@/components/instructor/lessons/LessonForm";
import TopicForm from "@/components/instructor/topics/TopicForm";

import { useCreateModule } from "@/hooks/queries/instructor/useCreateModule";
import { useUpdateModule } from "@/hooks/queries/instructor/useUpdateModule";
import { useCreateLesson } from "@/hooks/queries/instructor/useCreateLesson";
import { useUpdateLesson } from "@/hooks/queries/instructor/useUpdateLesson";
import { useCreateTopic } from "@/hooks/queries/instructor/useCreateTopic";
import { useUpdateTopic } from "@/hooks/queries/instructor/useUpdateTopic";
import { useCreateSubTopic } from "@/hooks/queries/instructor/useCreateSubTopic";
import { useUpdateSubTopic } from "@/hooks/queries/instructor/useUpdateSubTopic";
import { useSubTopic } from "@/hooks/queries/instructor/useSubTopic";
import { useCreateConcept } from "@/hooks/queries/instructor/useCreateConcept";
import { useUpdateConcept } from "@/hooks/queries/instructor/useUpdateConcept";
import { useConcept } from "@/hooks/queries/instructor/useConcept";

const TITLES = {
  module: { create: "Create Module", edit: "Edit Module" },
  lesson: { create: "Create Lesson", edit: "Edit Lesson" },
  topic: { create: "Create Topic", edit: "Edit Topic" },
  subTopic: { create: "Create SubTopic", edit: "Edit SubTopic" },
  concept: { create: "Create Concept", edit: "Edit Concept" },
};

// SubTopic and Concept reuse TopicForm — same fields, different label.
const TOPIC_FORM_LABELS = {
  subTopic: { entityLabel: "SubTopic", parentLabel: "topic" },
  concept: { entityLabel: "Concept", parentLabel: "subtopic" },
};

/**
 * One reusable create/edit modal for the structural entities
 * (Module/Lesson/Topic/SubTopic/Concept) that share an identical
 * title+description+isPublished form shape. Content is intentionally NOT handled here — it
 * already has a richer, working, per-type modal (AddCellModal) and inline
 * edit mode inside the Lesson Composer canvas.
 *
 * `state` is null when closed, otherwise:
 *   { entity: "module"|"lesson"|"topic"|"subTopic"|"concept", mode: "create"|"edit",
 *     courseId?, parentId?, entityData?, context? }
 * - module/create needs `courseId`; module/edit needs `entityData` (has courseId, order).
 * - lesson/create needs `parentId` (moduleId); lesson/edit needs `entityData` + `parentId` (moduleId).
 * - topic/create needs `parentId` (lessonId); topic/edit needs `entityData` + `parentId` (lessonId).
 * - subTopic/create needs `parentId` (topicId); subTopic/edit needs `entityData` + `parentId` (topicId).
 * - concept/create needs `parentId` (subTopicId); concept/edit needs `entityData` + `parentId` (subTopicId).
 * `context` ({ module, lesson, topic, subTopic }) is handed back to onCreated untouched.
 */
export function EntityFormModal({ state, onClose, onCreated }) {
  const { showToast } = useToast();

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const createSubTopic = useCreateSubTopic();
  const updateSubTopic = useUpdateSubTopic();
  const createConcept = useCreateConcept();
  const updateConcept = useUpdateConcept();

  // The Course Map's lazily loaded SubTopic/Concept rows carry no children or
  // contents, so the publish guard reads the full record when editing one.
  const editingId = state?.mode === "edit" ? (state.entityData || state.initialData)?.id : null;
  const { data: editingSubTopic } = useSubTopic(state?.entity === "subTopic" ? editingId : null);
  const { data: editingConcept } = useConcept(state?.entity === "concept" ? editingId : null);

  if (!state) return null;

  const { entity, mode, courseId, parentId, moduleId, context } = state;
  const entityData = state.entityData || state.initialData || null;
  const title = TITLES[entity]?.[mode] ?? "";

  const handleSubmit = async (values) => {
    try {
      let created = null;

      if (entity === "module") {
        if (mode === "create") {
          const res = await createModule.mutateAsync({ ...values, courseId });
          created = res?.data ?? res;
        } else {
          await updateModule.mutateAsync({
            moduleId: entityData.id,
            moduleData: { ...values, courseId: entityData.courseId, order: entityData.order },
          });
        }
      } else if (entity === "lesson") {
        if (mode === "create") {
          const res = await createLesson.mutateAsync({ ...values, moduleId: parentId });
          created = res?.data ?? res;
        } else {
          await updateLesson.mutateAsync({
            lessonId: entityData.id,
            lessonData: { ...values, moduleId: parentId, order: entityData.order },
          });
        }
      } else if (entity === "topic") {
        if (mode === "create") {
          const res = await createTopic.mutateAsync({ ...values, lessonId: parentId });
          created = res?.data ?? res;
        } else {
          await updateTopic.mutateAsync({
            topicId: entityData.id,
            topicData: { ...values, lessonId: parentId, order: entityData.order },
          });
        }
      } else if (entity === "subTopic") {
        if (mode === "create") {
          const res = await createSubTopic.mutateAsync({ ...values, topicId: parentId });
          created = res?.data ?? res;
        } else {
          await updateSubTopic.mutateAsync({
            subTopicId: entityData.id,
            topicId: parentId,
            subTopicData: { ...values, order: entityData.order },
          });
        }
      } else if (entity === "concept") {
        if (mode === "create") {
          const res = await createConcept.mutateAsync({ ...values, subTopicId: parentId });
          created = res?.data ?? res;
        } else {
          await updateConcept.mutateAsync({
            conceptId: entityData.id,
            subTopicId: parentId,
            conceptData: { ...values, order: entityData.order },
          });
        }
      }

      showToast(
        mode === "create" ? `${entity[0].toUpperCase()}${entity.slice(1)} created` : `${entity[0].toUpperCase()}${entity.slice(1)} updated`,
        "success"
      );
      onClose();
      if (mode === "create") onCreated?.({ entity, parentId, moduleId, courseId, created, context });
    } catch (error) {
      showToast(
        error?.response?.data?.message || `Failed to ${mode === "create" ? "create" : "update"} ${entity}.`,
        "error"
      );
    }
  };

  const isPending =
    createModule.isPending ||
    updateModule.isPending ||
    createLesson.isPending ||
    updateLesson.isPending ||
    createTopic.isPending ||
    updateTopic.isPending ||
    createSubTopic.isPending ||
    updateSubTopic.isPending ||
    createConcept.isPending ||
    updateConcept.isPending;

  return (
    <Modal open onClose={onClose} title={title} size="md">
      {entity === "module" && (
        <ModuleForm
          compact
          mode={mode}
          initialValues={entityData}
          lessonsCount={entityData?.lessons?.length ?? 0}
          loading={isPending}
          onSubmit={handleSubmit}
        />
      )}
      {entity === "lesson" && (
        <LessonForm
          compact
          mode={mode}
          initialValues={entityData}
          contentsCount={entityData?.topics?.length ?? 0}
          loading={isPending}
          onSubmit={handleSubmit}
        />
      )}
      {entity === "topic" && (
        <TopicForm
          compact
          mode={mode}
          initialValues={entityData}
          contentsCount={entityData?._count?.contents ?? 0}
          loading={isPending}
          onSubmit={handleSubmit}
        />
      )}
      {entity === "subTopic" && (
        <TopicForm
          compact
          mode={mode}
          initialValues={entityData}
          // A SubTopic may be published once it has Concepts or its own content.
          contentsCount={(editingSubTopic?.concepts?.length ?? 0) + (editingSubTopic?.contents?.length ?? 0)}
          loading={isPending}
          onSubmit={handleSubmit}
          {...TOPIC_FORM_LABELS.subTopic}
        />
      )}
      {entity === "concept" && (
        <TopicForm
          compact
          mode={mode}
          initialValues={entityData}
          contentsCount={editingConcept?.contents?.length ?? 0}
          loading={isPending}
          onSubmit={handleSubmit}
          {...TOPIC_FORM_LABELS.concept}
        />
      )}
    </Modal>
  );
}
