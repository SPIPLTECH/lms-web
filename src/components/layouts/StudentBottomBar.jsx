"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AiAssistantButton from "@/features/ai-assistant/components/AiAssistantButton";
import { useAiLauncher } from "@/features/ai-assistant/context/AiLauncherContext";
import { PRIMARY_NAV_ITEMS } from "@/components/student/NavigationStrip/navigationItems";

// The Student phone navigation (below sm; the hamburger drawer it replaces
// was phones-only too). Three equal columns, so the gaps between items are
// equal and the AI button sits exactly in the centre: `left` | Ask AI | `right`.
// Most pages fill the sides with the Learning / Submissions tabs
// (StudentBottomTabs); the learn page fills them with Previous / Next.
// z-40: under the learn page's sheets and drawers (z-50) and the AI window.
// `showAi={false}` leaves the centre empty (a quiz is being attempted), so
// the sides keep their places.
export default function StudentBottomBar({ left, right, ariaLabel = "Student navigation", showAi = true }) {
  const launcher = useAiLauncher();

  return (
    <nav
      aria-label={ariaLabel}
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid h-14 grid-cols-3 items-center">
        <div className="flex justify-center">{left}</div>
        <div className="flex flex-col items-center gap-0.5">
          {showAi && (
            <>
              <AiAssistantButton placement="bar" onOpen={() => launcher?.open()} />
              <span className="text-[11px] font-semibold leading-none text-foreground">Ask AI</span>
            </>
          )}
        </div>
        <div className="flex justify-center">{right}</div>
      </div>
    </nav>
  );
}

// One slot of the bar: a link (tabs) or a button (Previous/Next).
export function BottomBarItem({ href, onClick, icon: Icon, label, active = false, disabled = false, title, ariaLabel }) {
  const className = `flex min-w-16 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-semibold leading-none transition ${
    active ? "text-link" : "text-muted-foreground hover:text-foreground"
  } ${disabled ? "opacity-40 cursor-not-allowed hover:text-muted-foreground" : "cursor-pointer"}`;
  const content = (
    <>
      <span
        className={`flex h-6 w-11 items-center justify-center rounded-full transition ${active ? "bg-link/15" : ""}`}
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} title={title} className={className}>
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
    item && <BottomBarItem href={item.href} icon={item.icon} label={item.label} active={isTabActive(pathname, item)} />;

  return <StudentBottomBar ariaLabel="Student tabs" left={tab(leftItem)} right={tab(rightItem)} />;
}
