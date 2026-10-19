"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, X } from "lucide-react";

import { useInstructorNavDrawer } from "@/context/InstructorNavDrawerContext";
import { PRIMARY_NAV_ITEMS } from "@/components/instructor/NavigationStrip/navigationItems";
import useAuth from "@/hooks/useAuth";
import Modal from "@/components/ui/Modal";
import { ThemeModeRow } from "@/components/ui/shadcn/theme-switcher";

function isHrefActive(pathname, href) {
  if (!href) return false;
  if (href.endsWith("/dashboard")) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSubtreeActive(pathname, item) {
  if (item.children) return item.children.some((child) => isSubtreeActive(pathname, child));
  return isHrefActive(pathname, item.href);
}

// One row in the drawer's nav tree — a plain link for leaf items, or an
// expand/collapse group for items with children (mirrors the desktop
// QuickActionStrip's dropdowns, see PRIMARY_NAV_ITEMS). Recurses for the one
// extra nesting level "Work" uses under "Teaching". Starts expanded when the
// current page lives inside it, so the active section is visible on open.
function DrawerNavItem({ item, pathname, depth = 0, onNavigate }) {
  const active = isSubtreeActive(pathname, item);
  const [open, setOpen] = useState(active);
  const Icon = item.icon;
  const indent = { paddingLeft: `${1 + depth}rem` };

  if (!item.children) {
    const leafActive = isHrefActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        style={indent}
        className={`flex items-center gap-4 pr-4 py-3 rounded-xl transition-all duration-200 ${
          leafActive
            ? "bg-primary text-primary-foreground font-bold"
            : "text-foreground hover:text-foreground hover:bg-muted/50 font-semibold"
        }`}
      >
        <Icon size={18} className={leafActive ? "text-primary-foreground" : "text-muted-foreground"} />
        <span className="text-nav">{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={indent}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 pr-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
          active ? "text-primary font-bold" : "text-foreground hover:text-foreground hover:bg-muted/50 font-semibold"
        }`}
      >
        <Icon size={18} className={active ? "text-primary" : "text-muted-foreground"} />
        <span className="text-nav flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-1">
          {item.children.map((child) => (
            <DrawerNavItem key={child.label} item={child} pathname={pathname} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

// The Instructor mobile navigation drawer — opened from the header's
// hamburger button (see DashboardNavbar) via shared context. Now the sole
// mobile nav surface (the bottom tab bar was removed): it mirrors the
// desktop top-nav's 5 sections in full via PRIMARY_NAV_ITEMS, plus the theme
// switch and Logout. Messages and Profile stay reachable
// from the header's own icons, which are always visible on mobile.
export default function InstructorNavDrawer() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { isOpen, close } = useInstructorNavDrawer();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    const handlePopState = () => close();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen, close]);

  const handleLogout = () => {
    setShowLogoutModal(false);
    close();
    // logout() itself clears auth state and redirects to the Landing Page —
    // navigating here too would race it while cookies/user state are still
    // present, which is what let the old redirect bounce back into the app.
    logout();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm sm:hidden" onClick={close} />
      <div className="fixed top-0 left-0 h-screen w-[80%] max-w-xs bg-background border-r border-border/60 rounded-r-2xl z-[70] sm:hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-left duration-200">
        <div className="h-14 px-5 flex items-center justify-between border-b border-border/60 shrink-0">
          <span className="text-sm font-black text-foreground tracking-tight">Navigation</span>
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <DrawerNavItem key={item.label} item={item} pathname={pathname} onNavigate={close} />
          ))}

          <div className="my-2 border-t border-border/60" />

          <ThemeModeRow />

          <div className="my-2 border-t border-border/60" />

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-semibold transition-all duration-200 cursor-pointer"
          >
            <LogOut size={18} className="text-rose-400" />
            <span className="text-nav">Logout</span>
          </button>
        </nav>
      </div>

      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-6 text-center py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to sign out of your account?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-750 text-foreground transition cursor-pointer"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
