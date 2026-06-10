"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

type Notification = {
  id: number;
  message: string;
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (
    message: string
  ) => void;
};

const NotificationContext =
  createContext<NotificationContextType | null>(
    null
  );

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const addNotification = (
    message: string
  ) => {
    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        message,
      },
    ]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(
    NotificationContext
  );

  if (!context) {
    throw new Error(
      "useNotificationContext must be used inside NotificationProvider"
    );
  }

  return context;
}