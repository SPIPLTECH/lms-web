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
 *
 * `placement="bar"` is the same button seated in the centre of the Student
 * mobile bottom bar (StudentBottomBar): not fixed, a little smaller, raised
 * half out of the bar with a ring of page background around it.
 * `hideBelowSm` hides the floating button on phones, where that bar's centre
 * button opens the assistant instead.
 */
const SIDE_CLASSES = {
  left: "left-[calc(1.25rem_+_env(safe-area-inset-left))]",
  right: "right-[calc(1.25rem_+_env(safe-area-inset-right))]",
};
export default function AiAssistantButton({ isOpen, onOpen, side = "right", placement = "floating", hideBelowSm = false }) {
  if (isOpen) return null;

  const placementClasses =
    placement === "bar"
      ? "-mt-6 h-12 w-12 ring-4 ring-background"
      : `fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] ${SIDE_CLASSES[side === "left" ? "left" : "right"]} z-[9190] h-14 w-14 ${hideBelowSm ? "max-sm:hidden" : ""}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Ask OTree AI Assistant"
      aria-label="Ask OTree AI Assistant"
      className={`btn ${placementClasses} flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-xl transition cursor-pointer outline-none focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-violet-400`}
      style={{ "--btn-rainbow-fill": "#7C3AED", borderRadius: "9999px" }}
    >
      <Sparkles size={placement === "bar" ? 20 : 22} className="fill-current animate-pulse" />
    </button>
  );
}
