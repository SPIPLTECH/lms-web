"use client";

import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import ProgressBar from "@/components/student/courses/ProgressBar";

function formatResumeTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// "About this lesson" clamps to 3 lines by default so it reads as a compact
// paragraph instead of pushing the video/tabs further down; a Read More
// toggle reveals the rest. Collapses again on every new lesson.
export default function LessonOverviewPanel({ lesson, initialTime = 0, videoDuration = 0 }) {
  const overviewDescription = lesson?.description || "No specific lesson objectives provided.";
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  useEffect(() => {
    setOverviewExpanded(false);
  }, [lesson?.id]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/80 bg-[#0d0e16]/60 backdrop-blur-md shadow-xl p-4 sm:p-5 space-y-3">
      <h4 className="text-sm font-black uppercase tracking-widest text-foreground">About this lesson</h4>
      <div className="space-y-1.5">
        <p
          className={`text-sm text-foreground leading-relaxed font-medium ${
            overviewExpanded ? "" : "line-clamp-3"
          }`}
        >
          {overviewDescription}
        </p>
        {overviewDescription.length > 180 && (
          <button
            type="button"
            onClick={() => setOverviewExpanded((prev) => !prev)}
            className="text-[12px] font-black uppercase tracking-wider text-primary hover:text-orange-300 transition cursor-pointer bg-transparent border-0 outline-none min-h-[36px]"
          >
            {overviewExpanded ? "Show Less" : "Read More"}
          </button>
        )}
      </div>

      {initialTime > 3 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <PlayCircle size={14} className="text-primary shrink-0" />
            <span className="text-sm font-bold text-orange-300">
              Continue Learning — you left at {formatResumeTime(initialTime)}
            </span>
          </div>
          {videoDuration > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar
                  value={Math.min(100, Math.round((initialTime / videoDuration) * 100))}
                  size="xs"
                  variant="gradient"
                />
              </div>
              <span className="text-[12px] font-extrabold text-primary shrink-0">
                {Math.min(100, Math.round((initialTime / videoDuration) * 100))}%
              </span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
