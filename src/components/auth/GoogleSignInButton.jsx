"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Sign in with Google" via Google Identity Services.
 *
 * Google renders the button and, on success, hands back an ID token
 * (`credential`). This component only passes that token up; the API verifies
 * it and decides which account it is — no profile data from the browser is
 * trusted. Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, so
 * environments without Google sign-in keep the plain password form.
 *
 * Props:
 *   onCredential(credential) — called with the ID token; may be async.
 *   disabled                 — hides the button while a sign-in is running.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

let gisPromise = null;
function loadGoogleIdentityServices() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        gisPromise = null;
        reject(new Error("Google sign-in could not be loaded."));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

export const isGoogleSignInEnabled = () => Boolean(CLIENT_ID);

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentityServices()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) callbackRef.current?.(response.credential);
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: Math.min(containerRef.current.offsetWidth || 320, 400),
        });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        aria-busy={disabled}
        className={`flex justify-center min-h-[44px] ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />
      {loadError && <p className="text-center text-xs text-muted-foreground">{loadError}</p>}
    </div>
  );
}
