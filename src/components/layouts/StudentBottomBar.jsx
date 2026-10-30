"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AiAssistantButton from "@/features/ai-assistant/components/AiAssistantButton";
import { useAiLauncher } from "@/features/ai-assistant/context/AiLauncherContext";
import { PRIMARY_NAV_ITEMS } from "@/components/student/NavigationStrip/navigationItems";

// The Student phone navigation (below sm; the hamburger drawer it replaces
// was phones-only too).
// - Standard pages (StudentBottomTabs): three equal columns (`left` | Ask AI | `right`).
// - Learn page (`includePrimaryTabs` or `innerLeft`/`innerRight`): five equal
//   columns (`Previous` | `Learning` | Ask AI | `Submissions` | `Next`) so the
//   AI button stays centred while keeping primary navigation alongside lesson
//   controls.
// z-40: under the learn page's sheets and drawers (z-50) and the AI window.
// `showAi={false}` leaves the centre empty (a quiz is being attempted), so
// the sides keep their places. `tourId` / `tourTap` mark the whole bar for
// the onboarding tour (the learn page's Previous / Next).
export default function StudentBottomBar({
  left,
  innerLeft,
  innerRight,
  right,
  includePrimaryTabs = false,
  ariaLabel = "Student navigation",
  showAi = true,
  tourId,
  tourTap,
}) {
  const launcher = useAiLauncher();
  const pathname = usePathname();
  const [learningItem, submissionsItem] = PRIMARY_NAV_ITEMS.filter((item) => item.primaryOnMobile);

  const resolvedInnerLeft =
    innerLeft ??
    (includePrimaryTabs && learningItem ? (
      <BottomBarItem
        href={learningItem.href}
        icon={learningItem.icon}
        label={learningItem.label}
        active={isTabActive(pathname, learningItem)}
        tourId={learningItem.tourId}
        compact
      />
    ) : null);

  const resolvedInnerRight =
    innerRight ??
    (includePrimaryTabs && submissionsItem ? (
      <BottomBarItem
        href={submissionsItem.href}
        icon={submissionsItem.icon}
        label={submissionsItem.label}
        active={isTabActive(pathname, submissionsItem)}
        tourId={submissionsItem.tourId}
        compact
      />
    ) : null);

  const fiveColumns = Boolean(resolvedInnerLeft || resolvedInnerRight);

  return (
    <nav
      aria-label={ariaLabel}
      data-tour={tourId}
      data-tour-tap={tourTap}
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid h-14 items-center ${fiveColumns ? "grid-cols-5 px-0.5" : "grid-cols-3"}`}>
        <div className="flex min-w-0 justify-center">{left}</div>
        {fiveColumns && <div className="flex min-w-0 justify-center">{resolvedInnerLeft}</div>}
        <div className="flex min-w-0 flex-col items-center gap-0.5" data-tour={showAi ? "ask-ai" : undefined}>
          {showAi && (
            <>
              <AiAssistantButton placement="bar" onOpen={() => launcher?.open()} />
              <span
                className={`font-semibold leading-none text-foreground whitespace-nowrap ${
                  fiveColumns ? "text-[10px] min-[390px]:text-[11px]" : "text-[11px]"
                }`}
              >
                Ask AI
              </span>
            </>
          )}
        </div>
        {fiveColumns && <div className="flex min-w-0 justify-center">{resolvedInnerRight}</div>}
        <div className="flex min-w-0 justify-center">{right}</div>
      </div>
    </nav>
  );
}

// One slot of the bar: a link (tabs) or a button (Previous/Next).
export function BottomBarItem({
  href,
  onClick,
  icon: Icon,
  label,
  active = false,
  disabled = false,
  compact = false,
  title,
  ariaLabel,
  tourId,
}) {
  const className = `flex flex-col items-center justify-center gap-0.5 py-1 font-semibold leading-none transition ${
    compact
      ? "min-w-0 w-full px-0.5 text-[10px] min-[390px]:text-[11px]"
      : "min-w-16 px-2 text-[11px]"
  } ${active ? "text-link" : "text-muted-foreground hover:text-foreground"} ${
    disabled ? "opacity-40 cursor-not-allowed hover:text-muted-foreground" : "cursor-pointer"
  }`;
  const content = (
    <>
      <span
        className={`flex h-6 items-center justify-center rounded-full transition ${
          compact ? "w-9 min-[390px]:w-11" : "w-11"
        } ${active ? "bg-link/15" : ""}`}
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} title={title} data-tour={tourId} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel} className={className}>
      {content}
    </button>
  );
}

function isTabActive(pathname, item) {
  if (!pathname) return false;
  return [item.href, ...(item.matches || [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

// Learning | Ask AI | Submissions — every Student page except the learn page
// (its own Previous/Next bar) and a quiz attempt.
export function StudentBottomTabs() {
  const pathname = usePathname();
  const [leftItem, rightItem] = PRIMARY_NAV_ITEMS.filter((item) => item.primaryOnMobile);
  const tab = (item) =>
    item && <BottomBarItem href={item.href} icon={item.icon} label={item.label} active={isTabActive(pathname, item)} tourId={item.tourId} />;

  return <StudentBottomBar ariaLabel="Student tabs" left={tab(leftItem)} right={tab(rightItem)} />;
}
