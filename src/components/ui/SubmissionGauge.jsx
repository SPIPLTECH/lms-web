"use client";

/**
 * Semi-circular "how many of them have handed it in" gauge.
 *
 * ProgressBar is the linear equivalent, but it is a full-width bar with its own
 * percentage label — it cannot sit inline at the right edge of a dense list
 * row, which is the only thing this is for. Renders the arc, the filled
 * portion, and a dot riding the end of the fill.
 *
 * `value` / `total` are counts, not a percentage, so the same component labels
 * assignment submissions and Final-test attempts without either caller having
 * to pre-divide (and mis-handle total = 0).
 */

const SIZE = 44;
const RADIUS = 18;
const CX = 22;
const CY = 22;
// Half a circle: the sweep this arc can ever show.
const ARC_LENGTH = Math.PI * RADIUS;

/** Where the leading dot sits, sweeping left (0%) to right (100%). */
const dotPosition = (ratio) => {
  const angle = Math.PI * (1 - ratio);
  return { x: CX + RADIUS * Math.cos(angle), y: CY - RADIUS * Math.sin(angle) };
};

const toneFor = (ratio) => {
  if (ratio >= 0.8) return "text-emerald-500";
  if (ratio >= 0.4) return "text-amber-500";
  return "text-red-500";
};

export default function SubmissionGauge({ value = 0, total = 0, label = "submitted" }) {
  // No enrolled students means the ratio is undefined, not zero — show an empty
  // track rather than a red "0%" that reads like nobody has handed anything in.
  const hasDenominator = total > 0;
  const ratio = hasDenominator ? Math.min(1, Math.max(0, value / total)) : 0;
  const percent = hasDenominator ? Math.round(ratio * 100) : null;
  const dot = dotPosition(ratio);

  const description = hasDenominator
    ? `${value} of ${total} ${label} (${percent}%)`
    : `No enrolled students yet`;

  return (
    <div className="flex shrink-0 items-center gap-2" title={description}>
      <svg
        width={SIZE}
        height={CY + 4}
        viewBox={`0 0 ${SIZE} ${CY + 4}`}
        role="img"
        aria-label={description}
        className={hasDenominator ? toneFor(ratio) : "text-muted-foreground/40"}
      >
        {/* Track */}
        <path
          d={`M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          className="stroke-muted"
        />
        {/* Filled portion */}
        {hasDenominator && ratio > 0 && (
          <path
            d={`M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH * (1 - ratio)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        )}
        {/* Leading dot */}
        {hasDenominator && ratio > 0 && (
          <circle cx={dot.x} cy={dot.y} r={3} fill="currentColor" />
        )}
      </svg>

      <span className="text-[10px] font-black tabular-nums text-foreground">
        {hasDenominator ? `${percent}%` : "—"}
      </span>
    </div>
  );
}
