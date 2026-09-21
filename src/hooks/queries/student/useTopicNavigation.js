"use client";

import { useMemo } from "react";

import { resolveLessonPathway } from "@/lib/courseUnits";

// Topic list + prev/next derivations across the whole course, plus the
// single gated entry point (selectTopic) every topic-navigation control
// routes through. Mirrors useLessonNavigation.js one level down: Lessons
// with locked/unpublished status never contribute topics here because
// getCourseById already empties `lesson.topics` for a locked lesson, so
// crossing into locked content is impossible by construction — no
// separate lock check is needed the way useLessonNavigation needs one.
//
// `pathway` resolves the selected Lesson down to its deepest container
// (Topic → SubTopic → Concept, each defaulting to its first child) — the
// node whose own contents/quizzes the player shows, with the matching
// courseUnits placeholder key. The trailing options object keeps the
// existing positional signature intact.
export default function useTopicNavigation(
  course,
  selectedLesson,
  selectedTopicId,
  setSelectedLesson,
  setSelectedTopicId,
  lessons,
  { selectedSubTopicId = null, selectedConceptId = null } = {}
) {
  const topics = useMemo(() => {
    const modules = course?.modules || [];
    return modules.flatMap((module) =>
      (module.lessons || []).flatMap((lesson) =>
        (lesson.topics || []).map((topic) => ({
          ...topic,
          lessonId: lesson.id,
          moduleId: module.id,
        }))
      )
    );
  }, [course]);

  const currentTopicIndex = useMemo(() => {
    return topics.findIndex((t) => t.id === selectedTopicId);
  }, [topics, selectedTopicId]);

  const currentTopic = currentTopicIndex >= 0 ? topics[currentTopicIndex] : null;

  const previousTopic = useMemo(() => {
    return currentTopicIndex > 0 ? topics[currentTopicIndex - 1] : null;
  }, [topics, currentTopicIndex]);

  const nextTopic = useMemo(() => {
    return currentTopicIndex >= 0 && currentTopicIndex < topics.length - 1
      ? topics[currentTopicIndex + 1]
      : null;
  }, [topics, currentTopicIndex]);

  const nextLessonForTopic = useMemo(() => {
    if (!nextTopic || !selectedLesson || nextTopic.lessonId === selectedLesson.id) {
      return null;
    }
    return lessons.find((l) => l.id === nextTopic.lessonId) || null;
  }, [nextTopic, selectedLesson, lessons]);

  const selectTopic = (topic) => {
    if (!topic) return;
    if (!selectedLesson || topic.lessonId !== selectedLesson.id) {
      const lessonMatch = lessons.find((l) => l.id === topic.lessonId);
      if (lessonMatch) setSelectedLesson(lessonMatch);
    }
    setSelectedTopicId(topic.id);
  };

  const pathway = useMemo(
    () =>
      resolveLessonPathway(selectedLesson, {
        topicId: selectedTopicId,
        subTopicId: selectedSubTopicId,
        conceptId: selectedConceptId,
      }),
    [selectedLesson, selectedTopicId, selectedSubTopicId, selectedConceptId]
  );

  return {
    topics,
    currentTopic,
    currentSubTopic: pathway.subTopic,
    currentConcept: pathway.concept,
    pathway,
    currentTopicIndex,
    previousTopic,
    nextTopic,
    nextLessonForTopic,
    selectTopic,
  };
}
