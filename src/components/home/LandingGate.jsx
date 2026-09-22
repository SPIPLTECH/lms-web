"use client";

import useAuth from "@/hooks/useAuth";
import Loader from "@/components/common/Loader";

/**
 * Holds the landing page back from a visitor who is already signed in.
 *
 * AuthContext redirects an authenticated visitor off "/" to their dashboard,
 * but only once the server has confirmed the session — a round trip during
 * which the marketing page would otherwise paint in full and then yank itself
 * away. Rendering the loader for that window is what makes reopening the
 * browser land on the dashboard instead of flashing the landing page first.
 *
 * Guests never reach this branch: with no session cookie AuthContext resolves
 * synchronously to `user === null`, so the page renders normally — including
 * on the server, which keeps the landing page fully crawlable.
 */
export default function LandingGate({ children }) {
  const { user, loading } = useAuth();

  // `user` here may still be the unverified cached identity. That is the right
  // signal: if verification later fails, AuthContext clears it and the landing
  // page renders — we only ever delay someone we believe is leaving anyway.
  if (!loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader />
      </div>
    );
  }

  return children;
}
