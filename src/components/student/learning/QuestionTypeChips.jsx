"use client";

// The board question types of the topic the student is in, as tags (SSC
// Class 10 Test Series only — see lib/questionTypes.js). Clicking one opens
// the topic's quiz picker on that type; the first tag, "About" (value "All"),
// shows the topic's description.
//   active  — the type the picker is showing (null: picker closed, "All": About)
//   current — the type of the question the player is on, marked while the
//             picker is closed
export default function QuestionTypeChips({ types, active = null, current = null, onPick, className = "" }) {
  if (!types?.length) return null;
  const chips = [{ type: "All", label: "About", count: null }, ...types];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label="Question types in this topic">
      {chips.map(({ type, label = type, count }) => {
        const isActive = active === type;
        const isCurrent = !active && current === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            aria-pressed={isActive}
            // globals.css gives every <button> an unlayered border-radius that
            // beats Tailwind's rounded-full, so the pill radius is set inline.
            style={{ borderRadius: 9999 }}
            title={
              type === "All"
                ? "About this topic"
                : isCurrent
                  ? "The question you are on is of this type"
                  : `Show the ${type} quizzes of this topic`
            }
            className={`inline-flex h-7 items-center gap-1.5 border px-2.5 text-xs font-semibold transition cursor-pointer ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : isCurrent
                  ? "border-primary/70 bg-primary/10 text-primary"
                  : "border-border bg-background/60 text-foreground/80 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {label}
            {count !== null && (
              <span className={`tabular-nums text-[11px] ${isActive ? "opacity-90" : "text-muted-foreground"}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
