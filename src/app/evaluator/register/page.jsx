"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";

import useEvaluatorRegistration from "@/hooks/queries/evaluator/useEvaluatorRegistration";
import useRegisterEvaluator from "@/hooks/queries/evaluator/useRegisterEvaluator";

import AuthAlert from "@/components/auth/AuthAlert";
import AuthInput from "@/components/auth/AuthInput";
import AuthFooter from "@/components/auth/AuthFooter";
import Button from "@/components/ui/Button";
import Loader from "@/components/common/Loader";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

// Same rules as the backend's registerSchema (auth.validation.js).
const validate = (form) => {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 100) errors.name = "Name must be 2 to 100 characters.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (form.phoneNumber.trim() && !PHONE_PATTERN.test(form.phoneNumber.trim())) {
    errors.phoneNumber = "Phone number must be 7 to 15 digits.";
  }
  if (form.password.length < 8 || form.password.length > 128) {
    errors.password = "Password must be 8 to 128 characters.";
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
};

// AuthInput is shared with login and the other auth pages, so this page's
// input look is passed in rather than changed there. `peer` and the right
// padding keep AuthInput's show-password toggle working.
const INPUT_CLASS =
  "peer h-[46px] w-full rounded-lg border border-border bg-muted/60 pl-3.5 !pr-11 text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 outline-none transition-colors " +
  "hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/25 " +
  "aria-[invalid=true]:!border-destructive";

const STEPS = [
  "Create your account and log in.",
  "Evaluate C-CAT Section A and Section B.",
  "After your evaluation, submit feedback through the separate external feedback form.",
  "Use the same email address for registration and feedback.",
];

const ACCOUNT_INFO = (accessHours) => [
  { label: "Access", value: `${accessHours} hours from registration.` },
  { label: "Enrollment", value: "Section A and Section B are added automatically." },
  { label: "Expiry", value: "Access cannot be extended or restarted." },
];

// One surface for all three cards: same background, border, rounding and shadow.
const SURFACE = "rounded-2xl border border-border bg-background shadow-xl";
const CARD = `${SURFACE} p-5 sm:p-6`;
const PANEL = `${SURFACE} p-5 text-sm leading-relaxed text-muted-foreground`;

// The shared AuthLayout caps its card at 448px for the short auth forms, so
// this page uses the same brand heading and card styling in its own wrapper.
// With an `aside` (the instructions): form on the left, the two info cards
// stacked on the right from md up (form column ~1.2x the info column); on
// phones the form comes first and the info cards follow.
function RegisterShell({ children, aside }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className={`w-full ${aside ? "max-w-[480px] md:max-w-[880px]" : "max-w-[480px]"}`}>
        <h1 className="mb-4 text-center text-3xl font-extrabold leading-none tracking-tight text-primary sm:mb-5 sm:text-4xl">
          Orange Tree LMS
        </h1>
        {aside ? (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start md:gap-4 lg:gap-5">
            <div className={CARD}>{children}</div>
            <aside className="space-y-5">{aside}</aside>
          </div>
        ) : (
          <div className={CARD}>{children}</div>
        )}
      </div>
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-left text-[11px] font-semibold text-red-500">
      {message}
    </p>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-left text-xs font-semibold text-foreground">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
        <FlaskConical className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">Evaluator Registration</h2>
        <p className="mt-0.5 text-pretty text-sm text-muted-foreground">Create your account to start evaluating Orange Tree LMS.</p>
      </div>
    </div>
  );
}

function StepsPanel() {
  return (
    <section aria-labelledby="evaluator-steps" className={PANEL}>
      <h3 id="evaluator-steps" className="text-sm font-semibold text-foreground">
        What You Need to Do
      </h3>
      <ol className="mt-3 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
            >
              {index + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AccountPanel({ accessHours }) {
  return (
    <section aria-labelledby="evaluator-account" className={PANEL}>
      <h3 id="evaluator-account" className="text-sm font-semibold text-foreground">
        Account Information
      </h3>
      <dl className="mt-3 divide-y divide-border">
        {ACCOUNT_INFO(accessHours).map(({ label, value }) => (
          <div key={label} className="py-2.5 first:pt-0 last:pb-0">
            <dt className="font-semibold text-foreground">{label}</dt>
            <dd className="mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function EvaluatorRegisterPage() {
  const router = useRouter();
  const { data: registration, isLoading, isError } = useEvaluatorRegistration();
  const registerMutation = useRegisterEvaluator();
  // A double click fires two submits before React re-renders the disabled button.
  const submittingRef = useRef(false);

  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const errors = validate(form);
    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) return;

    submittingRef.current = true;
    try {
      const email = form.email.trim();
      await registerMutation.mutateAsync({
        name: form.name.trim(),
        email,
        password: form.password,
        ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
      });
      // Same email verification as every other account; login comes after.
      router.replace(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? "Could not reach the server. Please check your connection." : "Registration failed.")
      );
      submittingRef.current = false;
    }
  };

  const header = <PageHeader />;

  const inputProps = (name) => ({
    id: `evaluator-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    className: INPUT_CLASS,
    "aria-invalid": fieldErrors[name] ? "true" : undefined,
    "aria-describedby": fieldErrors[name] ? `evaluator-${name}-error` : undefined,
  });

  if (isLoading) {
    return (
      <RegisterShell>
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </RegisterShell>
    );
  }

  if (isError || !registration?.open) {
    return (
      <RegisterShell>
        {header}
        <div className="mt-6 space-y-5">
          <AuthAlert
            type={isError ? "error" : "info"}
            message={
              isError
                ? "Could not check whether evaluator registration is open. Please try again later."
                : "Evaluator registration is not open right now."
            }
          />
          <AuthFooter backHref="/login" backText="Back to login" />
        </div>
      </RegisterShell>
    );
  }

  return (
    <RegisterShell
      aside={
        <>
          <StepsPanel />
          <AccountPanel accessHours={registration.accessHours} />
        </>
      }
    >
      {header}

      <form onSubmit={handleSubmit} className="mt-5" noValidate>
        <AuthAlert type="error" message={error} />

        <div className="space-y-3.5">
          <Field id="evaluator-name" label="Full Name" error={fieldErrors.name}>
            <AuthInput type="text" placeholder="Your full name" autoComplete="name" required {...inputProps("name")} />
          </Field>

          <Field id="evaluator-email" label="Email Address" error={fieldErrors.email}>
            <AuthInput type="email" placeholder="you@example.com" autoComplete="email" required {...inputProps("email")} />
          </Field>

          <Field id="evaluator-phoneNumber" label="Phone Number (Optional)" error={fieldErrors.phoneNumber}>
            <AuthInput type="tel" placeholder="e.g. 9876543210" autoComplete="tel" {...inputProps("phoneNumber")} />
          </Field>

          <Field id="evaluator-password" label="Password" error={fieldErrors.password}>
            <AuthInput type="password" placeholder="At least 8 characters" autoComplete="new-password" required {...inputProps("password")} />
          </Field>

          <Field id="evaluator-confirmPassword" label="Confirm Password" error={fieldErrors.confirmPassword}>
            <AuthInput type="password" placeholder="Re-enter your password" autoComplete="new-password" required {...inputProps("confirmPassword")} />
          </Field>
        </div>

        <Button
          type="submit"
          disabled={registerMutation.isPending}
          aria-busy={registerMutation.isPending}
          className="mt-5 h-12 w-full font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {registerMutation.isPending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Creating account…
            </span>
          ) : (
            "Create Evaluator Account"
          )}
        </Button>

        <div className="mt-4 [&>div]:pt-1">
          <AuthFooter question="Already registered?" actionHref="/login" actionText="Log in" />
        </div>
      </form>
    </RegisterShell>
  );
}
