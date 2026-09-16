"use client";

import { Megaphone, AlertCircle, Sparkles, Bell, Clock, CheckCircle2 } from "lucide-react";

export function getCategoryIcon(type) {
  switch (type) {
    case "ANNOUNCEMENT":
    case "COURSE":
      return <Megaphone className="text-primary" size={18} />;
    case "ALERT":
      return <AlertCircle className="text-rose-400" size={18} />;
    case "SYSTEM":
      return <Sparkles className="text-blue-400" size={18} />;
    default:
      return <Bell className="text-purple-400" size={18} />;
  }
}

export function formatTimestamp(dateStr) {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnouncementCard({ item, onMarkRead }) {
  return (
    <div
      onClick={() => !item.isRead && onMarkRead(item.id)}
      className={`p-4 rounded-2xl border transition duration-200 flex items-start justify-between gap-4 cursor-pointer ${
        !item.isRead
          ? "bg-background/90 border-primary/30 shadow-md shadow-orange-500/5"
          : "bg-background/40 border-border/60 hover:border-transparent/60 opacity-80"
      }`}
    >
      {/* Left Side: Icon & Details */}
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="p-2.5 rounded-xl bg-muted/60 border border-transparent/50 shrink-0 mt-0.5">
          {getCategoryIcon(item.type)}
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground leading-snug truncate">
              {item.title || "Course Announcement"}
            </h3>

            {!item.isRead && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/20 text-primary border border-primary/30 shrink-0">
                New
              </span>
            )}
          </div>

          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {item.message || item.body || item.content}
          </p>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-muted-foreground" />
              {formatTimestamp(item.createdAt)}
            </span>
            {item.courseTitle && (
              <span className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground font-semibold border border-transparent/40">
                {item.courseTitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Mark Read Action */}
      {!item.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(item.id);
          }}
          title="Mark as read"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer shrink-0"
        >
          <CheckCircle2 size={16} />
        </button>
      )}
    </div>
  );
}
