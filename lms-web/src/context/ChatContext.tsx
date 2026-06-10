"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

type Message = {
  id: number;
  text: string;
};

type ChatContextType = {
  messages: Message[];
};

const ChatContext =
  createContext<ChatContextType | null>(
    null
  );

export function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages] =
    useState<Message[]>([]);

  return (
    <ChatContext.Provider
      value={{
        messages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context =
    useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChatContext must be used inside ChatProvider"
    );
  }

  return context;
}