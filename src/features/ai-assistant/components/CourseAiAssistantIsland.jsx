"use client";

import AiAssistantWidget from "./AiAssistantWidget";

/**
 * Client island for the public course page, which is an async Server
 * Component and so cannot host a stateful widget directly.
 *
 * Scope is left to AiAssistantWidget: an anonymous visitor gets GUEST, a
 * signed-in visitor gets BROWSING. Neither is enrolled from this page's point
 * of view, and in both cases the backend independently re-derives the real
 * scope per turn, so nothing here can widen access.
 */
export default function CourseAiAssistantIsland({ courseId, courseTitle }) {
  return (
    <AiAssistantWidget courseId={courseId} courseTitle={courseTitle} isEnrolled={false} />
  );
}
