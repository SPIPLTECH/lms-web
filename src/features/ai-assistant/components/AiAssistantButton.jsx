"use client";

import { Sparkles } from "lucide-react";

/**
 * Launcher FAB — visually identical to the Instructor-side "OTree AI Assistant" button.
 * `side="left"` moves it off the bottom-right corner, where a video player
 * keeps its fullscreen control.
 */
export default function AiAssistantButton({ isOpen, onOpen, side = "right" }) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Ask OTree AI Assistant"
      aria-label="Ask OTree AI Assistant"
      className={`btn fixed bottom-5 ${side === "left" ? "left-5" : "right-5"} z-[9190] flex h-14 w-14 shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-xl transition cursor-pointer`}
      style={{ "--btn-rainbow-fill": "#7C3AED", borderRadius: "9999px" }}
    >
      <Sparkles size={22} className="fill-current animate-pulse" />
    </button>
  );
}
