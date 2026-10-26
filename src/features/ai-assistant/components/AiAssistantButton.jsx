"use client";

import { Sparkles } from "lucide-react";

/**
 * Launcher FAB — visually identical to the Instructor-side "OTree AI Assistant" button.
 * `side="left"` moves it off the bottom-right corner, where a video player
 * keeps its fullscreen control.
 *
 * The 20px offsets grow by the device's safe-area insets (home indicator,
 * rounded corners) where the browser reports them; a keyboard focus ring
 * shows because the global button styles give buttons none.
 */
const SIDE_CLASSES = {
  left: "left-[calc(1.25rem_+_env(safe-area-inset-left))]",
  right: "right-[calc(1.25rem_+_env(safe-area-inset-right))]",
};
export default function AiAssistantButton({ isOpen, onOpen, side = "right" }) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Ask OTree AI Assistant"
      aria-label="Ask OTree AI Assistant"
      className={`btn fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] ${SIDE_CLASSES[side === "left" ? "left" : "right"]} z-[9190] flex h-14 w-14 shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-xl transition cursor-pointer outline-none focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet-400`}
      style={{ "--btn-rainbow-fill": "#7C3AED", borderRadius: "9999px" }}
    >
      <Sparkles size={22} className="fill-current animate-pulse" />
    </button>
  );
}
