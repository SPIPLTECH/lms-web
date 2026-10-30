"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, m } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/shadcn/dropdown-menu";
import type { NavItem, NavSubItem } from "@/components/instructor/NavigationStrip/navigationItems";

// This strip is in every dashboard's navbar. Loading framer-motion's features
// lazily keeps them out of every dashboard page's initial JS; until they
// arrive the active pill simply renders in place without the slide.
const loadMotionFeatures = () => import("./motionFeatures").then((mod) => mod.default);

// The floating "quick action" strip used by both the Instructor and Student
// dashboards. Layout, styling, responsiveness, and animations live here once;
// each role only supplies its own `items` + `ariaLabel`. `bare` drops the
// own rounded/bordered pill-container chrome and lets the row scroll
// horizontally instead of wrapping — for embedding directly inside another
// bar (e.g. the top navbar) as plain flex children, not a nested strip.
export function QuickActionStrip({ items, ariaLabel, bare = false }: { items: NavItem[]; ariaLabel: string; bare?: boolean }) {
  const pathname = usePathname();


  return (
    <nav
      aria-label={ariaLabel}
      className={bare ? "min-w-0" : "-mx-1 rounded-2xl border border-card-border bg-card/80 backdrop-blur-md px-2 py-2 shadow-sm"}
    >
      {/* Responsive pill row. Bare mode scrolls horizontally
          (fixed-height host bar); standalone mode wraps to fit the window. */}
      <div
        className={
          bare
            ? "flex items-center gap-1 overflow-x-auto scrollbar-none"
            : "flex flex-wrap justify-center items-center gap-1.5 p-1"
        }
      >
        <LazyMotion features={loadMotionFeatures}>
          {items.map((item) => (
            <NavPill key={item.label} item={item} active={isItemActive(pathname, item)} pathname={pathname} ariaLabel={ariaLabel} />
          ))}
        </LazyMotion>
      </div>
    </nav>
  );
}

function isHrefActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href.endsWith("/dashboard")) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// A sub-item may itself hold one further level of children (e.g. "Work"
// nested under "Learning") — recurse so the whole chain highlights as active.
function isSubItemActive(pathname: string, item: NavSubItem): boolean {
  if (item.children) return item.children.some((child) => isSubItemActive(pathname, child));
  return isHrefActive(pathname, item.href);
}

function isItemActive(pathname: string, item: NavItem) {
  if (item.children) return item.children.some((child) => isSubItemActive(pathname, child));
  return isHrefActive(pathname, item.href);
}

// Opens immediately on hover, closes after a short delay so moving the
// pointer from trigger to content (or between a submenu and its parent)
// doesn't close the menu before it lands. Clicking the trigger "pins" it
// open — Radix's default trigger behavior toggles an already-open menu
// closed on click, which fights the hover-open state (the menu would open
// on hover and then immediately close on the click that was meant to keep
// it open for the follow-up click on an item). onTriggerClick prevents
// that default toggle and pins the menu open until an item is chosen or
// the user clicks outside/presses escape (handled via onOpenChange).
function useHoverOpen(closeDelayMs = 150) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRef = useRef(false);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const onMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const onMouseLeave = () => {
    if (pinnedRef.current) return;
    closeTimer.current = setTimeout(() => setOpen(false), closeDelayMs);
  };
  const onTriggerClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (closeTimer.current) clearTimeout(closeTimer.current);
    pinnedRef.current = true;
    setOpen(true);
  };
  const onOpenChange = (next: boolean) => {
    if (!next) pinnedRef.current = false;
    setOpen(next);
  };

  return { open, setOpen: onOpenChange, onMouseEnter, onMouseLeave, onTriggerClick };
}

function NavPill({
  item,
  active,
  pathname,
  ariaLabel,
  mobile,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
  ariaLabel: string;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  const layoutId = `nav-strip-active-pill-${ariaLabel}`;
  // Called unconditionally (rules-of-hooks) even though only the
  // item.children branch below uses it — item.children is stable per
  // NavPill instance, so this never actually changes across renders.
  const hover = useHoverOpen();

  // `bare` used to need its own hardcoded palette here, tuned for a fixed
  // solid navy topbar. The topbar is a glass-nav surface now (its own
  // --popover/--popover-foreground tokens, same as the rest of the app),
  // so both bare and standalone modes can share one token-driven style.
  const pillClass = cn(
    "relative flex items-center gap-1.5 rounded-xl font-bold whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
    mobile ? "px-3 py-2 text-sm" : "px-3 py-1.5 text-sm",
    active
      ? mobile
        ? "bg-primary text-primary-foreground"
        : "text-primary-foreground"
      : "text-slate-300 hover:bg-white/5"
  );

  if (item.children) {
    return (
      <DropdownMenu open={hover.open} onOpenChange={hover.setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={pillClass}
            aria-current={active ? "page" : undefined}
            onMouseEnter={hover.onMouseEnter}
            onMouseLeave={hover.onMouseLeave}
            onClick={hover.onTriggerClick}
          >
            {active && !mobile && (
              <m.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl shadow-sm bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="size-3.5 relative z-10" />
            <span className="relative z-10">{item.label}</span>
            <ChevronDown className="size-3 relative z-10" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={0} onMouseEnter={hover.onMouseEnter} onMouseLeave={hover.onMouseLeave}>
          {item.children.map((child) =>
            child.children ? (
              <NestedSubMenuItem key={child.label} child={child} pathname={pathname} />
            ) : (
              <DropdownMenuItem key={child.href} asChild>
                <Link
                  href={child.href!}
                  className={cn("flex items-center gap-2", isHrefActive(pathname, child.href) && "font-bold text-primary")}
                >
                  <child.icon className="size-3.5" />
                  {child.label}
                </Link>
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href={item.href!} aria-current={active ? "page" : undefined} data-tour={item.tourId} className={pillClass}>
      {active && !mobile && (
        <m.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-xl bg-primary shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="size-3.5 relative z-10" />
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

// One nested level (e.g. "Work" under "Learning") — its own component so it
// can hold its own hover-open state, same pattern as the top-level dropdown.
function NestedSubMenuItem({ child, pathname }: { child: NavSubItem; pathname: string }) {
  const hover = useHoverOpen();
  const childActive = isSubItemActive(pathname, child);

  return (
    <DropdownMenuSub open={hover.open} onOpenChange={hover.setOpen}>
      <DropdownMenuSubTrigger
        className={cn("flex items-center gap-2", childActive && "font-bold text-primary")}
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
        onClick={hover.onTriggerClick}
      >
        <child.icon className="size-3.5" />
        {child.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent onMouseEnter={hover.onMouseEnter} onMouseLeave={hover.onMouseLeave}>
          {child.children!.map((grandchild) => (
            <DropdownMenuItem key={grandchild.href} asChild>
              <Link
                href={grandchild.href!}
                className={cn("flex items-center gap-2", isHrefActive(pathname, grandchild.href) && "font-bold text-primary")}
              >
                <grandchild.icon className="size-3.5" />
                {grandchild.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
