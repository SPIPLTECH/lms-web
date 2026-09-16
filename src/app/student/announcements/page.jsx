"use client";

import { useMemo, useState } from "react";
import {
  CheckCheck,
  Bell,
  Search,
} from "lucide-react";
import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import Loader from "@/components/common/Loader";
import useNotifications from "@/hooks/queries/student/useNotifications";
import useMarkNotificationAsRead from "@/hooks/queries/student/useMarkNotificationAsRead";
import useMarkAllNotificationsAsRead from "@/hooks/queries/student/useMarkAllNotificationsAsRead";
import { ANNOUNCEMENT_FILTER_TABS } from "@/features/student/constants/announcementsConfig";
import AnnouncementCard from "@/components/student/announcements/AnnouncementCard";

export default function StudentAnnouncementsPage() {
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // React Query Hooks
  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = (id) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesSearch =
        (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.message || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === "unread") return !item.isRead;
      if (filterTab === "announcement") return item.type === "ANNOUNCEMENT" || item.type === "COURSE";
      if (filterTab === "system") return item.type === "SYSTEM" || item.type === "ALERT";
      return true;
    });
  }, [notifications, searchQuery, filterTab]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6 pb-16 animate-fade-in duration-300">
      <PageHeader
        title="Announcements & Updates"
        subtitle="Stay informed with official course broadcasts, platform news, schedule changes, and live notifications."
      >
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </PageHeader>

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/80 border border-transparent/80 overflow-x-auto scrollbar-none">
          {ANNOUNCEMENT_FILTER_TABS.map((tab) => {
            const countLabel =
              tab.key === "all"
                ? ` (${notifications.length})`
                : tab.key === "unread" && unreadCount > 0
                ? unreadCount
                : null;

            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  filterTab === tab.key
                    ? "bg-muted text-foreground shadow-sm border border-transparent/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {tab.key === "unread" && unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-slate-950 text-[10px] font-black">
                    {countLabel}
                  </span>
                ) : tab.key === "all" ? (
                  <span>{countLabel}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full !pl-9 !pr-4 py-2 rounded-xl bg-background/80 border border-transparent/80 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-primary/50 transition"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center border border-transparent/80 bg-background/40 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <Bell size={24} />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Announcements Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "No items match your search query. Try clearing your search keywords."
                : "You are all caught up! Check back later for new course announcements and updates."}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((item) => (
            <AnnouncementCard key={item.id} item={item} onMarkRead={handleMarkAsRead} />
          ))
        )}
      </div>
    </div>
  );
}
