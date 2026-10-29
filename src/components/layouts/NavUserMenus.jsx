import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, CheckCheck, CheckSquare, ChevronDown, MessageSquare, Trash2 } from "lucide-react";

/** Helper to return type icon and color styles for notification items */
function getNotificationMeta(type) {
  switch (type?.toLowerCase()) {
    case "quiz":
      return {
        icon: CheckSquare,
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "course":
      return {
        icon: BookOpen,
        badgeClass: "bg-primary/15 text-primary border-primary/30",
      };
    case "chat":
      return {
        icon: MessageSquare,
        badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      };
    default:
      return {
        icon: Bell,
        badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      };
  }
}

// Premium notification bell + dropdown with Clear All & type icons.
export function NotificationsMenu({ notifications = [], unreadCount = 0, onMarkAllRead, onClearAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
          open
            ? "bg-muted border-transparent text-foreground"
            : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
        }`}
      >
        <Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-foreground shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover/95 p-3.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="mb-2.5 flex items-center justify-between border-b border-border/80 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[9.5px] font-black text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-primary hover:text-primary-hover transition cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  Mark read
                </button>
              )}
              {notifications.length > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="flex items-center gap-1 text-muted-foreground hover:text-rose-400 transition cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-medium text-muted-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground">No notifications to display.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { icon: TypeIcon, badgeClass } = getNotificationMeta(n.type);

                return (
                  <div
                    key={n.id}
                    className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left ${
                      n.read
                        ? "border-border/60 bg-background/40 text-muted-foreground"
                        : "border-primary/20 bg-primary/[0.06] text-foreground"
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${badgeClass}`}>
                      <TypeIcon size={14} />
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-xs font-bold text-foreground">{n.title}</h4>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{n.message}</p>
                      {n.time && <span className="block text-[9.5px] font-mono text-muted-foreground">{n.time}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="mt-2.5 border-t border-border/80 pt-2 text-[10.5px]">
              <span className="text-muted-foreground font-mono">{notifications.length} total</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact avatar-initial profile pill + dropdown (name, email, quick links, sign out).
// `onTakeTour` (students with a course) adds "Take the tour", which replays
// the onboarding tour of the learning page.
export function ProfileMenu({ user, onLogout, profileHref = "/student/profile", onTakeTour = null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-1.5 lg:pr-3 transition-all duration-200 hover:-translate-y-0.5 ${
          open ? "bg-muted" : "hover:bg-muted"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
          {user?.name?.[0]?.toUpperCase() || "S"}
        </span>
        <span className="hidden max-w-[100px] truncate text-[13px] font-semibold text-foreground lg:inline">
          {user?.name || "Profile"}
        </span>
        <ChevronDown size={14} className={`hidden text-muted-foreground transition-transform duration-200 lg:inline ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Profile menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-52 rounded-2xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 border-b border-white/[0.06] px-3 py-2">
            <p className="truncate text-xs font-bold text-foreground">{user?.name}</p>
            <p className="truncate text-[10.5px] text-muted-foreground">{user?.email}</p>
          </div>
          {profileHref && (
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center rounded-xl px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              My Profile
            </Link>
          )}
          {onTakeTour && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onTakeTour();
              }}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              Take the tour
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
