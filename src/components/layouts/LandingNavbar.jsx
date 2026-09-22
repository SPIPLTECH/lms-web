"use client";

import Link from "next/link";
import { PiOrangeDuotone } from "@/components/ui/reactIcons";
import { ThemeSwitcher } from "@/components/ui/shadcn/theme-switcher";
import useAuth from "@/hooks/useAuth";

export default function LandingNavbar() {
  // There is no "Go to Dashboard" affordance here on purpose: an authenticated
  // visitor never stays on the landing page long enough to need one. Once
  // AuthContext confirms the session it redirects them to their dashboard
  // (see the guest-route effect in AuthContext.jsx), so this navbar only ever
  // has to serve signed-out visitors. While that confirmation is still in
  // flight we show nothing rather than Login/Get Started, which would be wrong
  // for the user we already believe is signed in.
  const { user, loading } = useAuth();
  const isSignedOut = !loading && !user;

  return (
    <nav className="sticky top-3 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-surface/90 backdrop-blur-md px-3.5 sm:px-6 py-2 sm:py-2.5 shadow-xs">
        <Link
          href="/"
          aria-label="Orange Tree LMS Home"
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 flex items-center justify-center transition group-hover:bg-primary/20">
            <PiOrangeDuotone className="text-lg sm:text-xl text-primary" />
          </div>
          <span className="text-sm sm:text-base font-black tracking-wider text-primary">
            LMS
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[15px] sm:text-base font-semibold text-muted-foreground">
          <Link href="#courses" className="transition hover:text-foreground">
            Courses
          </Link>
          <Link href="#discovery" className="transition hover:text-foreground">
            Domains
          </Link>
          <Link href="#experience" className="transition hover:text-foreground">
            How It Works
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <ThemeSwitcher />

          {isSignedOut && (
            <>
              <Link
                href="/login"
                className="rounded-full px-2.5 sm:px-4 py-1.5 text-[15px] sm:text-base font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-full bg-primary px-3 sm:px-5 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 transition shadow-xs whitespace-nowrap"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
