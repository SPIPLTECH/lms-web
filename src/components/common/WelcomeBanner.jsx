"use client";

import Image from "next/image";

/**
 * The greeting-banner shell shared by every role's "Welcome back" card
 * (currently Instructor > My Courses and Student > My Courses). Purely
 * presentational — callers own their own data fetching and pass in
 * whatever they have; `stats` and `imageSrc` are both optional so a caller
 * with no numbers to show (or no matching illustration) still gets the
 * same greeting treatment without empty layout left behind for them.
 */
export default function WelcomeBanner({
  eyebrow = "Welcome back",
  name,
  subtitle,
  stats = null,
  isLoading = false,
  imageSrc = null,
  imageAlt = "",
}) {
  const hasStats = Array.isArray(stats) && stats.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Ambient wash — two blurred primary-tinted circles rather than a
          gradient on the surface itself, so the card keeps its normal
          `bg-card` in both themes. */}
      <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[70px]" />
      <div className="pointer-events-none absolute right-1/3 -bottom-28 h-64 w-64 rounded-full bg-primary/[0.07] blur-[70px]" />

      {imageSrc && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-72 select-none lg:block xl:w-[22rem]"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 55%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 55%)",
          }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="352px"
            className="object-cover object-center"
            priority={false}
          />
        </div>
      )}

      <div
        className={`relative flex flex-col gap-6 px-5 py-6 md:px-10 md:py-7 ${
          hasStats ? "lg:flex-row lg:items-center lg:gap-8" : ""
        } ${imageSrc ? "lg:pr-72 xl:pr-[22rem]" : ""}`}
      >
        <div className={`min-w-0 ${hasStats ? "shrink-0 md:max-w-sm lg:max-w-[17rem] xl:max-w-sm" : ""}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>

          <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {name} !
            <span className="inline-block origin-bottom-right animate-wave" aria-hidden="true">
              👋
            </span>
          </h1>

          {subtitle && (
            <p className="mt-2 min-h-[2.5rem] text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
          )}
        </div>

        {hasStats && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-3 lg:flex-1">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-3 md:px-4 backdrop-blur-sm"
              >
                <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                  <Icon size={16} className="text-primary" aria-hidden />
                </div>

                <div className="min-w-0">
                  {isLoading ? (
                    <div className="h-5 w-8 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-lg font-black leading-none text-foreground">{(value ?? 0).toLocaleString()}</p>
                  )}
                  <p className="mt-1 truncate text-[10.5px] font-semibold tracking-wide text-muted-foreground">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
