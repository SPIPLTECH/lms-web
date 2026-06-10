"use client";

import {
  createContext,
  useContext,
} from "react";

type SocketContextType = {
  connected: boolean;
};

const SocketContext =
  createContext<SocketContextType | null>(null);

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketContext.Provider
      value={{
        connected: true,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context =
    useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocketContext must be used inside SocketProvider"
    );
  }

  return context;
}