"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

const AiLauncherContext = createContext(null);

// Lets a launcher that lives outside an AiAssistantWidget — the Student
// mobile bottom bar's centre button — open it. Every mounted widget registers
// its open(); the most specific one wins: a page's own widget (which carries
// that page's course context) over the layout's general fallback widget.
export function AiLauncherProvider({ children }) {
  const widgetsRef = useRef(new Map());

  const register = useCallback((id, entry) => {
    widgetsRef.current.set(id, entry);
    return () => {
      widgetsRef.current.delete(id);
    };
  }, []);

  const open = useCallback(() => {
    let target = null;
    for (const entry of widgetsRef.current.values()) {
      if (!target || entry.priority >= target.priority) target = entry;
    }
    target?.open();
  }, []);

  const value = useMemo(() => ({ register, open }), [register, open]);

  return <AiLauncherContext.Provider value={value}>{children}</AiLauncherContext.Provider>;
}

// null outside a provider (Instructor/Admin/public pages), where every widget
// keeps its own floating launcher and nothing else needs to open it.
export function useAiLauncher() {
  return useContext(AiLauncherContext);
}
