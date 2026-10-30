"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import Cookies from "js-cookie";
import { useAuth } from "@/context/AuthContext";
import socketService from "@/services/socket.service";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "@/services/notification.service";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { EVALUATOR_STATES, evaluatorStateAt } from "@/lib/evaluatorAccess";

const NotificationContext = createContext();

let audioCtxSingleton = null;

// Self-contained chime player using HTML5 AudioContext
const playNotificationChime = () => {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtxSingleton || audioCtxSingleton.state === "closed") {
      audioCtxSingleton = new AudioCtx();
    }
    if (audioCtxSingleton.state === "suspended") {
      audioCtxSingleton.resume();
    }

    const audioCtx = audioCtxSingleton;
    const now = audioCtx.currentTime;

    // Tone 1: High soft bell note
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: Harmonious resonance
    setTimeout(() => {
      try {
        if (!audioCtxSingleton || audioCtxSingleton.state === "closed") return;
        const now2 = audioCtxSingleton.currentTime;
        const osc2 = audioCtxSingleton.createOscillator();
        const gain2 = audioCtxSingleton.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtxSingleton.destination);
        osc2.frequency.setValueAtTime(880, now2); // A5
        gain2.gain.setValueAtTime(0.06, now2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.25);
        osc2.start(now2);
        osc2.stop(now2 + 0.25);
      } catch {}
    }, 85);
  } catch (e) {
    console.warn("Chime playback bypassed:", e);
  }
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const { showToast } = useToast();
  const seenEventIdsRef = useRef(new Set());
  // Dedupe keys for caller-generated notifications (chat, etc.). Same idea as
  // seenEventIdsRef above, but keyed by whatever the caller considers "the same
  // event" — checked synchronously so a caller that re-fires on every render
  // cannot stack duplicate toasts before React has committed the state update.
  const seenNotifKeysRef = useRef(new Set());
  const isMountedRef = useRef(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchNotificationsCached = useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: [QUERY_KEYS.NOTIFICATIONS],
        queryFn: getNotifications,
        staleTime: 1000 * 60 * 2,
      }),
    [queryClient]
  );

  // State for login hover card
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUnreadCount, setLoginUnreadCount] = useState(0);
  const [loginUnreadNotifications, setLoginUnreadNotifications] = useState([]);

  // Load notifications from the backend if authenticated, otherwise use defaults
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        seenNotifKeysRef.current.clear();
        return;
      }
      // An expired evaluator is refused every non-auth API (403), so don't ask.
      if (evaluatorStateAt(user.evaluator, Date.now()) === EVALUATOR_STATES.EXPIRED) {
        setNotifications([]);
        return;
      }
      try {
        const data = await fetchNotificationsCached();
        const formatted = data.map(n => {
          let displayType = "system";
          const backendType = n.type.toUpperCase();
          if (backendType === "ENROLLMENT" || backendType === "COURSE_STATUS" || backendType === "COURSE_REVIEW" || backendType === "LESSON_PUBLISHED") {
            displayType = "course";
          } else if (backendType === "QUIZ_SUBMISSION" || backendType === "CERTIFICATE") {
            displayType = "quiz";
          } else if (backendType === "CHAT" || backendType.startsWith("QA")) {
            displayType = "chat";
          }
          return {
            id: n.id,
            title: n.title,
            message: n.message,
            type: displayType,
            time: new Date(n.createdAt).toLocaleDateString(),
            read: n.isRead,
            link: n.link || ""
          };
        });
        setNotifications(prev => {
          const map = new Map();
          formatted.forEach(n => map.set(n.id, n));
          prev.forEach(n => {
            if (!map.has(n.id)) {
              map.set(n.id, n);
            }
          });
          return Array.from(map.values());
        });

        // Alert user of unread notifications after fresh login with a beautiful card modal
        if (typeof window !== "undefined") {
          const isFreshLogin = sessionStorage.getItem("fresh_login");
          if (isFreshLogin === "true") {
            sessionStorage.removeItem("fresh_login");
            const unreadList = formatted.filter(n => !n.read);
            if (unreadList.length > 0) {
              setLoginUnreadCount(unreadList.length);
              setLoginUnreadNotifications(unreadList.slice(0, 3));
              setShowLoginModal(true);
              // Play audio chime
              playNotificationChime();
            }
          }
        }
      } catch (error) {
        console.error("Failed to load notifications from backend:", error);
      }
    };

    loadNotifications();
  }, [user, fetchNotificationsCached]);

  // `dedupeKey` makes a call idempotent: the first call for a given key adds the
  // notification, later calls with the same key are dropped — no duplicate entry,
  // no repeated chime, no repeated toast. Callers that observe a stream (chat
  // messages, for instance) pass a key derived from the underlying event.
  const addNotification = useCallback((title, message, type = "system", link = "", dedupeKey = "") => {
    if (dedupeKey) {
      if (seenNotifKeysRef.current.has(dedupeKey)) return;
      seenNotifKeysRef.current.add(dedupeKey);
    }

    const newNotif = {
      id: dedupeKey || "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title,
      message,
      type,
      time: "Just now",
      read: false,
      link
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem("lms_notifications", JSON.stringify(updated));
      return updated;
    });

    // Play chime sound
    playNotificationChime();
    
    // Trigger screen toast
    showToast(title, type === "quiz" ? "warning" : type === "class" ? "success" : "default");
  }, [showToast]);

  const markAllRead = async () => {
    try {
      if (user) {
        await markAllNotificationsAsRead();
      }
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        localStorage.setItem("lms_notifications", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read on backend:", err);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const clearAll = async () => {
    try {
      if (user) {
        await clearAllNotifications();
        // The cached /notifications query still holds the pre-clear list —
        // overwrite it so a later remount (which re-reads this cache within
        // its staleTime window) doesn't resurrect what we just deleted.
        queryClient.setQueryData([QUERY_KEYS.NOTIFICATIONS], []);
      }
    } catch (err) {
      console.error("Failed to clear notifications on backend:", err);
    } finally {
      setNotifications([]);
      localStorage.setItem("lms_notifications", JSON.stringify([]));
    }
  };

  const markAsRead = async (id) => {
    try {
      if (user && !id.startsWith("notif_")) {
        await markNotificationAsRead(id);
      }
      setNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem("lms_notifications", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Failed to mark notification as read on backend:", err);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  // Socket Observer for Real-Time Backend Notifications
  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (!token || !user) return;

    // Idempotent socket connect
    socketService.connect(token);

    const handleNewNotification = (notification) => {
      let displayType = "system";
      const backendType = notification.type.toUpperCase();
      if (backendType === "ENROLLMENT" || backendType === "COURSE_STATUS" || backendType === "COURSE_REVIEW" || backendType === "LESSON_PUBLISHED") {
        displayType = "course";
      } else if (backendType === "QUIZ_SUBMISSION" || backendType === "CERTIFICATE") {
        displayType = "quiz";
      } else if (backendType === "CHAT" || backendType.startsWith("QA")) {
        displayType = "chat";
        // Instantly invalidate questions cache so student sees replies without refreshing
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_QUESTIONS] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LESSON_QUERIES] });
      }

      const formatted = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: displayType,
        time: "Just now",
        read: notification.isRead,
        link: notification.link || ""
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === formatted.id)) {
          return prev;
        }
        return [formatted, ...prev];
      });

      // Play chime sound
      playNotificationChime();

      // Trigger screen toast
      showToast(
        notification.title,
        displayType === "quiz" ? "warning" : displayType === "course" ? "success" : "default"
      );
    };

    socketService.on("new_notification", handleNewNotification);

    return () => {
      socketService.off("new_notification", handleNewNotification);
    };
  }, [user, showToast]);

  // Keep notifications in sync across tabs.
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "lms_notifications" && e.newValue) {
        setNotifications(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const markEventAsSeen = (eventId) => {
    if (eventId) seenEventIdsRef.current.add(eventId);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAllRead,
        clearAll,
        markAsRead,
        markEventAsSeen,
      }}
    >
      {children}
      {showLoginModal && (
        <LoginNotificationCard 
          onClose={() => setShowLoginModal(false)} 
          unreadCount={loginUnreadCount} 
          recentNotifications={loginUnreadNotifications}
        />
      )}
    </NotificationContext.Provider>
  );
}

function LoginNotificationCard({ onClose, unreadCount, recentNotifications }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        {/* Pulsing Bell Icon */}
        <div className="h-16 w-16 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(242,199,199,0.15)] animate-pulse mb-5">
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <h2 className="text-2xl font-extrabold text-white leading-tight">Welcome Back!</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          You have <span className="text-orange-400 font-bold">{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span> waiting.
        </p>

        {/* Previews List */}
        <div className="w-full mt-6 space-y-3 max-h-60 overflow-y-auto pr-1">
          {recentNotifications.map(n => (
            <div key={n.id} className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 text-left flex gap-3 items-start">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 mt-0.5 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-white truncate">{n.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed break-words">{n.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="w-full mt-8 flex flex-col gap-3">
          <button 
            onClick={onClose} 
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-orange-500/10 active:scale-98 transition duration-150 cursor-pointer text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used inside a NotificationProvider");
  }
  return context;
};
