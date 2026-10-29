"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { useAuth } from "@/context/AuthContext";
import { useAiLauncher } from "../context/AiLauncherContext";
import AiAssistantButton from "./AiAssistantButton";

// The panel pulls in the markdown renderer and the streaming hook. Neither is
// needed until someone actually opens the assistant, so it is loaded on first
// open and kept mounted afterwards — same approach as the existing ChatWidget.
const AiAssistantWindow = dynamic(() => import("./AiAssistantWindow"), { ssr: false });

/**
 * Mount point for the AI Assistant.
 *
 * `scope` here is a UI hint ONLY — it decides which placeholder copy and
 * starter prompts to show. It is never sent to the server and grants nothing:
 * the backend runs resolveScope against the JWT and the database on every
 * single turn, so a tampered value in the browser changes nothing about what
 * the assistant can retrieve.
 *
 * @param {Object} [props]
 * @param {string} [props.courseId]
 * @param {string} [props.courseTitle]
 * @param {"GUEST"|"BROWSING"|"ENROLLED"} [props.scopeHint] override; otherwise derived
 * @param {boolean} [props.isEnrolled]
 * @param {() => object} [props.getPosition] returns the caller's current learning ids
 * @param {"left"|"right"} [props.side] screen corner for the launcher and panel
 * @param {boolean} [props.hideLauncherBelowSm] phones open it from the bottom bar instead
 * @param {boolean} [props.fallback] no launcher of its own; opened only through
 *   AiLauncherContext, and only when no page-level widget is mounted
 * @param {boolean} [props.hidden] not available right now (a quiz is being
 *   attempted): no launcher, no window, not openable; the conversation is kept
 */
export default function AiAssistantWidget({
  courseId,
  courseTitle,
  contentTitle,
  contentType,
  scopeHint,
  isEnrolled = false,
  getPosition,
  side = "right",
  hideLauncherBelowSm = false,
  fallback = false,
  hidden = false,
}) {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setHasOpened(true);
  }, []);

  // Make this widget openable from the Student bottom bar's AI button.
  const launcher = useAiLauncher();
  const widgetId = useId();
  useEffect(() => {
    if (hidden) return undefined;
    return launcher?.register(widgetId, { open, priority: fallback ? 0 : 1 });
  }, [launcher, widgetId, open, fallback, hidden]);

  // Hiding it closes an open window, so it does not pop back once shown again.
  useEffect(() => {
    if (hidden) setIsOpen(false);
  }, [hidden]);

  // Keep the latest getPosition without making useAiStream's callback churn on
  // every Learn Page re-render (its active ids change as the student scrolls).
  const positionRef = useRef(getPosition);
  positionRef.current = getPosition;
  const readPosition = useCallback(() => {
    try {
      return positionRef.current ? positionRef.current() || {} : {};
    } catch {
      return {};
    }
  }, []);

  // While AuthContext is still resolving, a signed-in user is indistinguishable
  // from a guest. Wait rather than briefly showing guest copy to a student.
  if (loading || hidden) return null;

  const scope = scopeHint || (!user ? "GUEST" : isEnrolled ? "ENROLLED" : "BROWSING");

  return (
    <>
      {!fallback && (
        <AiAssistantButton isOpen={isOpen} onOpen={open} side={side} hideBelowSm={hideLauncherBelowSm} />
      )}
      {hasOpened && (
        <AiAssistantWindow
          side={side}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          scope={scope}
          courseId={courseId}
          courseTitle={courseTitle}
          contentTitle={contentTitle}
          contentType={contentType}
          getPosition={readPosition}
          conversationId={conversationId}
          setConversationId={setConversationId}
        />
      )}
    </>
  );
}
