"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
// `Settings` is imported by the commented-out Settings entry below only.
import { ChevronDown, LifeBuoy, LogOut, X } from "lucide-react";

import { useStudentNavDrawer } from "@/context/StudentNavDrawerContext";
import { PRIMARY_NAV_ITEMS } from "@/components/student/NavigationStrip/navigationItems";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ui/ToastProvider";
import Modal from "@/components/ui/Modal";
import { ThemeModeRow } from "@/components/ui/shadcn/theme-switcher";

const SECONDARY_ITEMS = [
  // Settings — removed from the student drawer. The /student/settings route
  // itself is untouched and still reachable by URL; only the way in from the
  // nav is gone. To restore, uncomment this and the `Settings` icon import.
  // { id: "settings", label: "Settings", icon: Settings, href: "/student/settings" },
  { id: "help", label: "Help & Support", icon: LifeBuoy, href: "/student/settings" },
];

function isHrefActive(pathname, href) {
  if (!href) return false;
  if (href.endsWith("/dashboard")) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSubtreeActive(pathname, item) {
  if (item.children) return item.children.some((child) => isSubtreeActive(pathname, child));
  return isHrefActive(pathname, item.href);
}

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
            ? "bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]"
            : "text-foreground hover:text-foreground hover:bg-muted/50 font-semibold"
        }`}
      >
        <Icon size={18} className={leafActive ? "text-slate-950" : "text-muted-foreground"} />
        <span className="text-sm">{item.label}</span>
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
        <span className="text-sm flex-1 text-left">{item.label}</span>
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

export default function StudentNavDrawer() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { isOpen, close } = useStudentNavDrawer();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isItemActive = (item) => pathname && pathname.startsWith(item.href);

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

  const handleLogout = async () => {
    setShowLogoutModal(false);
    close();
    // logout() itself clears auth state and redirects to the Landing Page —
    // navigating here too would race it while cookies/user state are still
    // present, which is what let the old redirect bounce back into the app.
    // If the server couldn't end the session, the user stays signed in.
    const result = await logout();
    if (result?.ok === false) showToast(result.message, "error");
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

          {SECONDARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]"
                    : "text-foreground hover:text-foreground hover:bg-muted/50 font-semibold"
                }`}
              >
                <Icon size={18} className={active ? "text-primary-foreground" : "text-muted-foreground"} />
                <span className="text-nav">{item.label}</span>
              </Link>
            );
          })}

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
              className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-foreground transition cursor-pointer"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
