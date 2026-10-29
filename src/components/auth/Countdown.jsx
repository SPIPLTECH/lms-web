"use client";

const formatSeconds = (total) =>
  `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

export default function Countdown({
  seconds,
  loading,
  onResend,
  inline = false,
}) {
  if (inline) {
    return (
      <p className="text-sm text-muted-foreground">
        Didn't get a code?{" "}
        {seconds > 0 ? (
          <span className="tabular-nums">Resend in {formatSeconds(seconds)}</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="cursor-pointer font-medium text-primary hover:underline disabled:opacity-50"
          >
            {loading ? "Sending..." : "Resend code"}
          </button>
        )}
      </p>
    );
  }

  if (seconds > 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?
        </p>

        <p className="mt-1 font-medium text-primary">
          Resend in {seconds}s
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onResend}
        disabled={loading}
        className="font-medium text-primary transition hover:text-primary disabled:opacity-50"
      >
        {loading ? "Sending..." : "Resend OTP"}
      </button>
    </div>
  );
}
