"use client";

import { Check, X } from "lucide-react";

import AuthInput from "./AuthInput";
import PasswordRequirements from "./PasswordRequirements";

export default function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  passwordLabel = "New password",
  passwordPlaceholder = "",
  confirmPasswordLabel = "Confirm new password",
  confirmPasswordPlaceholder = "",
  showRequirements = true,
  showChecklist = true,
  idPrefix = "password",
  autoFocus = false,
}) {
  const passwordId = `${idPrefix}-new`;
  const confirmId = `${idPrefix}-confirm`;
  const requirementsId = `${idPrefix}-requirements`;
  const matchId = `${idPrefix}-match`;

  const confirmTouched = confirmPassword.length > 0;
  const matches = confirmTouched && confirmPassword === password;

  return (
    <>
      <div className="space-y-2">
        <label htmlFor={passwordId} className="block text-sm font-medium text-foreground">
          {passwordLabel}
        </label>
        <AuthInput
          id={passwordId}
          type="password"
          value={password}
          placeholder={passwordPlaceholder}
          onChange={onPasswordChange}
          autoComplete="new-password"
          aria-describedby={showRequirements ? requirementsId : undefined}
          autoFocus={autoFocus}
          required
        />
        {showRequirements && (
          <PasswordRequirements
            id={requirementsId}
            password={password}
            showChecklist={showChecklist}
          />
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor={confirmId} className="block text-sm font-medium text-foreground">
          {confirmPasswordLabel}
        </label>
        <AuthInput
          id={confirmId}
          type="password"
          value={confirmPassword}
          placeholder={confirmPasswordPlaceholder}
          onChange={onConfirmPasswordChange}
          autoComplete="new-password"
          aria-invalid={confirmTouched && !matches ? true : undefined}
          aria-describedby={confirmTouched ? matchId : undefined}
          required
        />
        {confirmTouched && (
          <p
            id={matchId}
            aria-live="polite"
            className={`flex items-center gap-1.5 text-xs ${matches ? "text-success" : "text-destructive"}`}
          >
            {matches ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <X size={13} aria-hidden="true" />
            )}
            {matches ? "Passwords match" : "Passwords don't match"}
          </p>
        )}
      </div>
    </>
  );
}
