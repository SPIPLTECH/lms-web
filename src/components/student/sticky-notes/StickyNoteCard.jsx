"use client";

import { useEffect, useState } from "react";
import { Pin, Edit2, Trash2, X } from "lucide-react";

import { useDeleteStickyNote } from "@/hooks/queries/student/useDeleteStickyNote";
import { useToggleStickyNotePin } from "@/hooks/queries/student/useToggleStickyNotePin";
import { useUpdateStickyNote } from "@/hooks/queries/student/useUpdateStickyNote";
import { STICKY_NOTE_COLORS } from "@/constants/stickyNoteColors";

function formatTimestamp(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const colorClasses = {
  yellow: "border-l-yellow-400 bg-yellow-400/10 text-yellow-100",
  grey: "border-l-slate-400 bg-slate-500/15 text-slate-200",
  gray: "border-l-slate-400 bg-slate-500/15 text-slate-200",
  blue: "border-l-blue-500 bg-blue-500/10 text-blue-200",
  green: "border-l-emerald-500 bg-emerald-500/10 text-emerald-200",
  pink: "border-l-rose-400 bg-rose-500/10 text-rose-200",
  purple: "border-l-purple-500 bg-purple-500/10 text-purple-200",
};

const colorStyles = {
  yellow: { borderLeftColor: "#facc15", backgroundColor: "rgba(250, 204, 21, 0.08)" },
  grey: { borderLeftColor: "#9ca3af", backgroundColor: "rgba(156, 163, 175, 0.12)" },
  gray: { borderLeftColor: "#9ca3af", backgroundColor: "rgba(156, 163, 175, 0.12)" },
  blue: { borderLeftColor: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.08)" },
  green: { borderLeftColor: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.08)" },
  pink: { borderLeftColor: "#f472b6", backgroundColor: "rgba(244, 114, 182, 0.08)" },
  purple: { borderLeftColor: "#a855f7", backgroundColor: "rgba(168, 85, 247, 0.08)" },
};

export default function StickyNoteCard({ note, onSeek }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || "yellow");

  // Keep local draft in sync if parent note changes
  useEffect(() => {
    setContent(note.content);
    setColor(note.color || "yellow");
  }, [note.content, note.color]);

  const { mutate: updateStickyNote, isPending: isUpdating } =
    useUpdateStickyNote();
  const { mutate: deleteStickyNote, isPending: isDeleting } =
    useDeleteStickyNote();
  const { mutate: togglePin, isPending: isPinning } =
    useToggleStickyNotePin();

  const handleSave = () => {
    updateStickyNote({
      stickyNoteId: note.id,
      payload: {
        content,
        color,
        timestamp: note.timestamp,
        isPinned: note.isPinned,
      },
    });
    setIsEditing(false);
  };

  const formattedTime = formatTimestamp(note.timestamp);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isEditing) onSeek?.(note.timestamp || 0);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isEditing) {
          e.preventDefault();
          onSeek?.(note.timestamp || 0);
        }
      }}
      style={colorStyles[color] || colorStyles.yellow}
      className={`group relative rounded-r-xl border-l-4 border-y border-r border-border/80 p-3 transition-all duration-200 cursor-pointer select-none ${
        colorClasses[color] || colorClasses.yellow
      }`}
    >
      {/* Top Header Row */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Timestamp Indicator */}
          <span className="font-mono text-[11px] font-bold text-primary">
            {formattedTime}
          </span>

          {note.isPinned && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              <Pin size={9} className="fill-amber-400" />
              Pinned
            </span>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePin(note.id);
            }}
            disabled={isPinning}
            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-primary transition cursor-pointer"
            title={note.isPinned ? "Unpin note" : "Pin note"}
          >
            <Pin size={12} className={note.isPinned ? "fill-orange-400 text-primary" : ""} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-blue-400 transition cursor-pointer"
            title="Edit note"
          >
            <Edit2 size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteStickyNote(note.id);
            }}
            disabled={isDeleting}
            className="p-1 rounded hover:bg-background text-muted-foreground hover:text-red-400 transition cursor-pointer"
            title="Delete note"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Note Content / Edit Form */}
      {isEditing ? (
        <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-background p-2.5 text-xs text-foreground placeholder-slate-500 outline-none focus:border-primary font-sans"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STICKY_NOTE_COLORS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setColor(item.name)}
                  style={{ backgroundColor: item.hex }}
                  className={`h-5 w-5 rounded-full transition cursor-pointer ${
                    color === item.name ? "ring-2 ring-white ring-offset-1 ring-offset-background scale-110" : "opacity-75 hover:opacity-100"
                  } ${item.className}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={isUpdating}
                className="px-2.5 py-1 rounded-lg bg-primary hover:bg-orange-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setContent(note.content);
                  setColor(note.color);
                  setIsEditing(false);
                }}
                className="p-1 rounded border border-transparent text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-xs font-normal leading-relaxed text-foreground">
          {note.content}
        </p>
      )}
    </div>
  );
}