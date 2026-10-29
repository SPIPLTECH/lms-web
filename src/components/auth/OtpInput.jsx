"use client";

import { useRef } from "react";

/**
 * Segmented one-time-code input. `value` is a contiguous digit string
 * (e.g. "1234"); each box shows one character of it. Supports typing,
 * paste of the whole code, SMS/email autofill, Backspace and arrow keys.
 */
export default function OtpInput({
  value = "",
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  describedBy,
}) {
  const refs = useRef([]);
  // Latest value, updated synchronously on every edit: focus moves before the
  // parent re-renders, so the focus guard must not read the stale prop.
  const latest = useRef(value);
  latest.current = value;

  const emit = (next) => {
    latest.current = next;
    onChange(next);
  };

  const focusAt = (index) => {
    const target = refs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  const write = (index, raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    const current = latest.current;
    const start = Math.min(index, current.length);
    const next = (
      current.slice(0, start) +
      digits +
      current.slice(start + digits.length)
    ).slice(0, length);

    emit(next);
    focusAt(start + digits.length);
  };

  const handleKeyDown = (index, e) => {
    const current = latest.current;
    if (e.key === "Backspace") {
      e.preventDefault();
      if (current[index]) {
        emit(current.slice(0, index) + current.slice(index + 1));
      } else if (index > 0) {
        emit(current.slice(0, index - 1) + current.slice(index));
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(Math.min(index + 1, current.length));
    }
  };

  const handleFocus = (index, e) => {
    // Keep the code contiguous: an empty box past the first gap sends focus
    // back to the next box that needs a digit.
    if (index > latest.current.length) {
      focusAt(latest.current.length);
      return;
    }
    e.target.select();
  };

  return (
    <div
      role="group"
      aria-label="Verification code"
      aria-describedby={describedBy}
      className="grid grid-cols-6 gap-2 sm:gap-2.5"
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={value[index] || ""}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => write(index, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            write(index, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => handleFocus(index, e)}
          className={`
            h-12 w-full min-w-0 rounded-lg border bg-muted text-center
            text-xl font-semibold tabular-nums text-foreground caret-primary
            outline-none transition-colors
            focus:border-primary focus:ring-2 focus:ring-primary/25
            disabled:opacity-60 sm:h-14 sm:text-2xl
            ${invalid ? "!border-destructive" : ""}
          `}
        />
      ))}
    </div>
  );
}
