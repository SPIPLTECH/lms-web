"use client";

import {
  createContext,
  useContext,
} from "react";

type AIContextType = {
  enabled: boolean;
};

const AIContext =
  createContext<AIContextType | null>(
    null
  );

export function AIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AIContext.Provider
      value={{
        enabled: true,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context =
    useContext(AIContext);

  if (!context) {
    throw new Error(
      "useAIContext must be used inside AIProvider"
    );
  }

  return context;
}