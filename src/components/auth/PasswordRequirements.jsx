"use client";

import { Check } from "lucide-react";

import { PASSWORD_RULES } from "@/lib/passwordPolicy";

// "Strong" is reserved for a password that meets every rule, so the meter
// never calls a password strong that the API would reject.
const STRENGTH_LEVELS = [
  { label: "Weak", bar: "bg-destructive", text: "text-destructive" },
  { label: "Medium", bar: "bg-warning", text: "text-warning" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

const getStrengthLevel = (password, metCount) => {
  if (!password) return -1;
  if (metCount === PASSWORD_RULES.length) return 2;
  return metCount >= 4 ? 1 : 0;
};

export default function PasswordRequirements({ password = "", id, showChecklist = true }) {
  const results = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
  const metCount = results.filter((rule) => rule.met).length;
  const level = getStrengthLevel(password, metCount);
  const strength = STRENGTH_LEVELS[level];

  return (
    <div id={id} className={showChecklist ? "space-y-2.5" : undefined}>
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-3 gap-1.5" aria-hidden="true">
          {STRENGTH_LEVELS.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full transition-colors ${
                strength && index <= level ? strength.bar : "bg-border"
              }`}
            />
          ))}
        </div>
        <span
          aria-live="polite"
          className={`w-14 text-right text-xs font-medium ${strength ? strength.text : "text-muted-foreground"}`}
        >
          {strength ? (
            <>
              <span className="sr-only">Password strength: </span>
              {strength.label}
            </>
          ) : null}
        </span>
      </div>

      {showChecklist && (
        <ul
          aria-label="Password requirements"
          className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2"
        >
          {results.map((rule) => (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-xs transition-colors ${
                rule.met ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                  rule.met ? "bg-success text-success-foreground" : "border border-border"
                }`}
              >
                {rule.met && <Check size={9} strokeWidth={3.5} />}
              </span>
              <span>
                {rule.label}
                <span className="sr-only">{rule.met ? " (met)" : " (not met)"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
