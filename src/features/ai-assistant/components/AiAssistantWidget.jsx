"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { useAuth } from "@/context/AuthContext";
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
 */
export default function AiAssistantWidget({
  courseId,
  courseTitle,
  scopeHint,
  isEnrolled = false,
  getPosition,
}) {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [conversationId, setConversationId] = useState(null);

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
  if (loading) return null;

  const scope = scopeHint || (!user ? "GUEST" : isEnrolled ? "ENROLLED" : "BROWSING");

  const open = () => {
    setIsOpen(true);
    setHasOpened(true);
  };

  return (
    <>
      <AiAssistantButton isOpen={isOpen} onOpen={open} />
      {hasOpened && (
        <AiAssistantWindow
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          scope={scope}
          courseId={courseId}
          courseTitle={courseTitle}
          getPosition={readPosition}
          conversationId={conversationId}
          setConversationId={setConversationId}
        />
      )}
    </>
  );
}
