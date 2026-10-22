"use client";

import VideoPlayer from "@/components/student/learning/VideoPlayer";

// Wraps one displayed lesson-content block. A displayed block can represent
// several underlying Content rows merged together (see contentDocument.js).
export default function LessonContentBlock({ item, lease, videoPlayerRef, ...videoPlayerProps }) {
  // h-full here is what VideoPlayer's own h-full/min-h-full (percentage
  // heights) resolve against — a short block still fills the frame with its
  // own card/border instead of exposing the frame's raw background below it,
  // while a block taller than the frame (VideoPlayer's min-h-full case) can
  // still grow past this and get picked up by the frame's own scrollbar.
  return (
    <div className="h-full">
      <VideoPlayer ref={videoPlayerRef} content={item} lease={lease} {...videoPlayerProps} />
    </div>
  );
}
