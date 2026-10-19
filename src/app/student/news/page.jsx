"use client";

import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { isToday, isYesterday, isThisWeek, format } from "date-fns";
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/layouts/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/common/Loader";
import useDashboard from "@/hooks/queries/student/useDashboard";
import { PAGE_SIZE, CATEGORY_TABS, RECENT_LABELS } from "@/features/student/constants/newsConfig";
import { buildNewsFeed } from "@/features/student/utils/newsHelpers";
import NewsCard from "@/components/student/news/NewsCard";
import NewsDetailModal from "@/components/student/news/NewsDetailModal";

function getGroupLabel(date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date.getTime() > Date.now()) return "Upcoming";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week";
  return format(date, "MMMM yyyy");
}

function LoadMoreSentinel({ onVisible }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="flex items-center gap-3 sm:gap-4 py-3">
      <span className="w-[17px] sm:w-[21px] shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Loading more…</span>
    </div>
  );
}

function FeedRow({ row, onOpenNews, onExpandOlder }) {
  if (row.type === "header") {
    return (
      <div className="flex items-center gap-3 sm:gap-4 pt-4 pb-1.5 first:pt-0">
        <span className="w-[17px] sm:w-[21px] shrink-0" aria-hidden="true" />
        <h2 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{row.label}</h2>
      </div>
    );
  }

  if (row.type === "olderToggle") {
    return (
      <div className="flex items-center gap-3 sm:gap-4 py-2">
        <span className="w-[17px] sm:w-[21px] shrink-0" aria-hidden="true" />
        <button
          type="button"
          onClick={onExpandOlder}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 rounded-xl border border-dashed border-card-border py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-transparent transition cursor-pointer"
        >
          <span>Show Older Updates ({row.count})</span>
          <ChevronDown size={13} />
        </button>
      </div>
    );
  }

  if (row.type === "loadMoreSentinel") {
    return <LoadMoreSentinel onVisible={row.onVisible} />;
  }

  return <NewsCard item={row.data} onOpen={onOpenNews} />;
}

export default function StudentNewsPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNews, setSelectedNews] = useState(null);
  const [visibleRecentCount, setVisibleRecentCount] = useState(PAGE_SIZE);
  const [olderExpanded, setOlderExpanded] = useState(false);
  const [visibleOlderCount, setVisibleOlderCount] = useState(PAGE_SIZE);

  const tabScrollRef = useRef(null);
  const listContainerRef = useRef(null);
  const listOffsetRef = useRef(0);

  // Real backend queries using centralized React Query hooks
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard();
  const calendarEvents = []; // calendar feature removed

  const enrolledCourses = dashboardData?.enrolledCoursesList ?? [];

  // Generate dynamic + curated news feed related to student's courses and batches
  const newsItems = useMemo(
    () => buildNewsFeed({ enrolledCourses, calendarEvents }),
    [enrolledCourses, calendarEvents]
  );

  // Filtered feed based on active tab & search query
  const filteredNews = useMemo(() => {
    return newsItems.filter((item) => {
      const matchesCategory =
        activeCategory === "ALL" || item.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseTag.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [newsItems, activeCategory, searchQuery]);

  // Split into "recent" (always visible) vs "older" (collapsed behind a toggle)
  const { recentItems, olderItems } = useMemo(() => {
    const recent = [];
    const older = [];
    for (const item of filteredNews) {
      const groupLabel = getGroupLabel(item.date);
      (RECENT_LABELS.has(groupLabel) ? recent : older).push({ ...item, groupLabel });
    }
    return { recentItems: recent, olderItems: older };
  }, [filteredNews]);

  // Reset pagination whenever the filtered set changes
  useEffect(() => {
    setVisibleRecentCount(PAGE_SIZE);
    setOlderExpanded(false);
    setVisibleOlderCount(PAGE_SIZE);
  }, [activeCategory, searchQuery]);

  const loadMoreRecent = useCallback(() => {
    setVisibleRecentCount((c) => Math.min(c + PAGE_SIZE, recentItems.length));
  }, [recentItems.length]);

  const loadMoreOlder = useCallback(() => {
    setVisibleOlderCount((c) => Math.min(c + PAGE_SIZE, olderItems.length));
  }, [olderItems.length]);

  const expandOlder = useCallback(() => setOlderExpanded(true), []);

  // Flatten into virtualizer rows: date headers, cards, the "older" toggle, and load-more sentinels
  const rows = useMemo(() => {
    const out = [];
    let lastLabel = null;

    for (const item of recentItems.slice(0, visibleRecentCount)) {
      if (item.groupLabel !== lastLabel) {
        out.push({ type: "header", id: `h-${item.groupLabel}`, label: item.groupLabel });
        lastLabel = item.groupLabel;
      }
      out.push({ type: "item", id: item.id, data: item });
    }

    if (recentItems.length > visibleRecentCount) {
      out.push({ type: "loadMoreSentinel", id: "sentinel-recent", onVisible: loadMoreRecent });
    }

    if (olderItems.length > 0) {
      if (!olderExpanded) {
        out.push({ type: "olderToggle", id: "older-toggle", count: olderItems.length });
      } else {
        let lastOlderLabel = null;
        for (const item of olderItems.slice(0, visibleOlderCount)) {
          if (item.groupLabel !== lastOlderLabel) {
            out.push({ type: "header", id: `h-older-${item.groupLabel}`, label: item.groupLabel });
            lastOlderLabel = item.groupLabel;
          }
          out.push({ type: "item", id: item.id, data: item });
        }
        if (olderItems.length > visibleOlderCount) {
          out.push({ type: "loadMoreSentinel", id: "sentinel-older", onVisible: loadMoreOlder });
        }
      }
    }

    return out;
  }, [recentItems, olderItems, visibleRecentCount, olderExpanded, visibleOlderCount, loadMoreRecent, loadMoreOlder]);

  useLayoutEffect(() => {
    listOffsetRef.current = listContainerRef.current?.offsetTop ?? 0;
  });

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return 0;
      if (row.type === "header") return 32;
      if (row.type === "olderToggle") return 52;
      if (row.type === "loadMoreSentinel") return 44;
      return 190;
    },
    overscan: 6,
    gap: 12,
    scrollMargin: listOffsetRef.current,
  });

  const scrollTabs = (direction) => {
    tabScrollRef.current?.scrollBy({ left: direction * 140, behavior: "smooth" });
  };

  if (isDashboardLoading) return <Loader />;

  return (
    <div className="space-y-4 pb-16 animate-fade-in duration-300">
      <PageHeader
        title="News & Updates"
        subtitle="Stay informed with real-time course updates, batch announcements, live session alerts, and platform feature releases."
      />

      {/* Control Bar: Categories & Search */}
      <div className="space-y-3">
        {/* Quick Action Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            aria-label="Scroll tabs left"
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={tabScrollRef}
            className="flex items-center gap-7 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory py-2"
          >
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCategory(tab.key)}
                className={`shrink-0 snap-start whitespace-nowrap text-sm font-semibold pb-1.5 border-b-2 transition cursor-pointer ${
                  activeCategory === tab.key
                    ? "text-primary border-primary"
                    : "text-foreground border-transparent hover:text-orange-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs(1)}
            aria-label="Scroll tabs right"
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search news & updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full !pl-9 !pr-4 py-2 rounded-xl bg-card border border-card-border text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-primary/50 transition"
          />
        </div>
      </div>

      {/* News Feed Timeline */}
      {filteredNews.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No News Items Found"
          description={
            searchQuery
              ? `No updates match "${searchQuery}". Try searching for another course or category.`
              : "Check back later for fresh daily course updates and batch news."
          }
        />
      ) : (
        <div ref={listContainerRef} className="relative max-w-3xl mx-auto md:mx-0 w-full">
          <div style={{ height: rowVirtualizer.getTotalSize(), width: "100%", position: "relative" }}>
            <span
              aria-hidden="true"
              className="absolute left-[8px] sm:left-[10px] top-0 bottom-0 w-px bg-muted"
            />
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <FeedRow row={row} onOpenNews={setSelectedNews} onExpandOlder={expandOlder} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* News Detail Modal Overlay */}
      <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
}
