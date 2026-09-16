"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Loader2,
  Search,
  X,
  Target,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Bookmark,
} from "lucide-react";

/**
 * Formats time in seconds to MM:SS or HH:MM:SS format
 */
function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Binary search to efficiently find active segment index
 */
function findActiveIndex(segments, currentTime) {
  if (!segments || segments.length === 0 || currentTime < segments[0].start) {
    return -1;
  }

  let low = 0;
  let high = segments.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (segments[mid].start <= currentTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

/**
 * Textbook-style compact transcript paragraph entry.
 * Designed like a book page paragraph: no cards, no borders, timestamp acts as paragraph margin indicator.
 */
const TranscriptRow = React.memo(
  ({
    segment,
    index,
    isActive,
    searchQuery,
    isBookmarked,
    onSeek,
    onToggleBookmark,
    registerRef,
  }) => {
    const handleClick = useCallback(() => {
      onSeek?.(segment.start);
    }, [onSeek, segment.start]);

    const handleKeyDown = useCallback(
      (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeek?.(segment.start);
        }
      },
      [onSeek, segment.start]
    );

    const renderText = useCallback(() => {
      if (!searchQuery || !searchQuery.trim()) {
        return segment.text;
      }

      const q = searchQuery.toLowerCase();
      const text = segment.text;
      const lower = text.toLowerCase();
      const parts = [];
      let lastIdx = 0;
      let matchIdx = lower.indexOf(q, lastIdx);

      while (matchIdx !== -1) {
        if (matchIdx > lastIdx) {
          parts.push(text.substring(lastIdx, matchIdx));
        }
        parts.push(
          <mark
            key={matchIdx}
            className="bg-primary/30 text-orange-400 font-bold px-0.5 rounded"
          >
            {text.substring(matchIdx, matchIdx + q.length)}
          </mark>
        );
        lastIdx = matchIdx + q.length;
        matchIdx = lower.indexOf(q, lastIdx);
      }

      if (lastIdx < text.length) {
        parts.push(text.substring(lastIdx));
      }

      return parts;
    }, [segment.text, searchQuery]);

    return (
      <div
        ref={(el) => registerRef(index, el)}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-current={isActive ? "true" : undefined}
        className={`group relative flex items-start gap-3.5 py-1.5 px-3 rounded-lg transition-colors cursor-pointer select-none ${
          isActive
            ? "bg-primary/10 text-foreground font-medium"
            : "hover:bg-background/30 text-foreground"
        }`}
      >
        {/* Subtle Active Left Accent Bar */}
        {isActive && (
          <div className="absolute left-0 top-1 bottom-1 w-1 bg-orange-400 rounded-r-full shadow-[0_0_8px_rgba(242,199,199,0.7)]" />
        )}

        {/* Compact Margin Timestamp (replaces bullet/pill button) */}
        <span
          className={`shrink-0 w-12 font-mono text-[13px] pt-0.5 transition-colors ${
            isActive
              ? "text-primary font-bold"
              : "text-primary/60 group-hover:text-primary"
          }`}
        >
          {formatTimestamp(segment.start)}
        </span>

        {/* Book Paragraph Text */}
        <p
          className={`text-[15px] leading-relaxed min-w-0 flex-1 break-words transition-colors ${
            isActive ? "text-foreground font-semibold" : "text-foreground group-hover:text-foreground"
          }`}
        >
          {renderText()}
        </p>

        {/* Bookmark Indicator */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark?.(index);
          }}
          className={`shrink-0 p-1 transition opacity-0 pointer-coarse:opacity-100 group-hover:opacity-100 ${
            isBookmarked ? "opacity-100 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark line"}
        >
          <Bookmark size={12} className={isBookmarked ? "fill-orange-400" : ""} />
        </button>
      </div>
    );
  }
);

TranscriptRow.displayName = "TranscriptRow";

export default function TranscriptPanel({
  segments = [],
  status = "ready",
  currentTime = 0,
  onSeek,
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarkedIndices, setBookmarkedIndices] = useState([]);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const containerRef = useRef(null);
  const rowRefs = useRef({});
  const isScrollingSelfRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const registerRef = useCallback((index, el) => {
    if (el) {
      rowRefs.current[index] = el;
    } else {
      delete rowRefs.current[index];
    }
  }, []);

  const activeIndex = useMemo(
    () => findActiveIndex(segments, currentTime),
    [segments, currentTime]
  );

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  const scrollToActiveSegment = useCallback(
    (index = activeIndex) => {
      const container = containerRef.current;
      const activeEl = rowRefs.current[index];

      if (!container || !activeEl) return;

      const containerHeight = container.clientHeight;
      const elTop = activeEl.offsetTop;
      const elHeight = activeEl.offsetHeight;

      const targetTop = elTop - containerHeight / 2 + elHeight / 2;

      isScrollingSelfRef.current = true;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingSelfRef.current = false;
      }, 500);
    },
    [activeIndex]
  );

  useEffect(() => {
    if (
      status === "ready" &&
      autoScrollEnabled &&
      !userHasScrolled &&
      activeIndex >= 0
    ) {
      scrollToActiveSegment(activeIndex);
    }
  }, [activeIndex, autoScrollEnabled, userHasScrolled, status, scrollToActiveSegment]);

  const handleScroll = useCallback(() => {
    if (isScrollingSelfRef.current) return;

    const container = containerRef.current;
    const activeEl = rowRefs.current[activeIndex];

    if (!container || !activeEl) return;

    const containerHeight = container.clientHeight;
    const elTop = activeEl.offsetTop;
    const currentScrollTop = container.scrollTop;

    const activeCenterScroll = elTop - containerHeight / 2;
    const distance = Math.abs(currentScrollTop - activeCenterScroll);

    if (distance > 80) {
      setUserHasScrolled(true);
    }
  }, [activeIndex]);

  const handleSegmentSeek = useCallback(
    (seconds) => {
      onSeek?.(seconds);
      setUserHasScrolled(false);
      setAutoScrollEnabled(true);
    },
    [onSeek]
  );

  const handleRecenter = useCallback(() => {
    setUserHasScrolled(false);
    setAutoScrollEnabled(true);
    if (activeIndex >= 0) {
      scrollToActiveSegment(activeIndex);
    }
  }, [activeIndex, scrollToActiveSegment]);

  const handleCopyTranscript = useCallback(() => {
    if (!segments || segments.length === 0) return;
    const fullText = segments
      .map((s) => `[${formatTimestamp(s.start)}] ${s.text}`)
      .join("\n");

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [segments]);

  const handleToggleBookmark = useCallback((idx) => {
    setBookmarkedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }, []);

  const showTranscript = status === "ready" && segments.length > 0;

  return (
    <div className="bg-[#0d0e16]/50 border border-border/60 rounded-2xl p-5 space-y-3 relative select-none">
      {/* Clean Minimal Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-foreground">
            Lesson Transcript
          </h4>
          {bookmarkedIndices.length > 0 && (
            <span className="text-[12px] text-primary font-mono">
              ({bookmarkedIndices.length} bookmarked)
            </span>
          )}
        </div>

        {/* Minimal Control Icons */}
        {showTranscript && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <button
              type="button"
              onClick={() => setShowSearchInput((prev) => !prev)}
              className="p-1.5 rounded-lg hover:text-foreground hover:bg-background transition cursor-pointer"
              title="Search transcript"
            >
              <Search size={14} />
            </button>

            <button
              type="button"
              onClick={handleCopyTranscript}
              className="p-1.5 rounded-lg hover:text-foreground hover:bg-background transition cursor-pointer"
              title="Copy transcript text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !autoScrollEnabled;
                setAutoScrollEnabled(next);
                if (next) handleRecenter();
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                autoScrollEnabled ? "text-primary bg-primary/10" : "hover:text-foreground hover:bg-background"
              }`}
              title={autoScrollEnabled ? "Auto-scroll ON" : "Auto-scroll OFF"}
            >
              <Target size={14} />
            </button>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg hover:text-foreground hover:bg-background transition cursor-pointer"
              title={expanded ? "Collapse panel" : "Expand panel"}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Search Input Bar (Shown when search icon clicked) */}
      {showTranscript && showSearchInput && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or phrases..."
            className="w-full bg-[#07080f] border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary/50"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm font-medium text-muted-foreground">
          <Loader2 size={14} className="animate-spin text-primary" />
          Loading transcript...
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="py-6 text-center text-sm text-red-400">
          Failed to load transcript.
        </div>
      )}

      {/* Unavailable State */}
      {status === "unavailable" && (
        <p className="py-4 text-center text-sm font-medium italic text-muted-foreground">
          Transcript unavailable.
        </p>
      )}

      {/* Continuous Textbook Transcript Flow */}
      {showTranscript && (
        <div className="relative">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            role="log"
            aria-label="Lesson transcript text"
            className={`space-y-1 overflow-y-auto pr-1 scrollbar-thin transition-all duration-300 ${
              expanded ? "max-h-[36rem]" : "max-h-72"
            }`}
          >
            {filteredSegments.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground italic">
                No matching lines found.
              </div>
            ) : (
              filteredSegments.map((segment) => {
                const originalIndex = segments.indexOf(segment);
                const isActive = originalIndex === activeIndex;
                const isBookmarked = bookmarkedIndices.includes(originalIndex);
                return (
                  <TranscriptRow
                    key={`${segment.start}-${originalIndex}`}
                    segment={segment}
                    index={originalIndex}
                    isActive={isActive}
                    searchQuery={searchQuery}
                    isBookmarked={isBookmarked}
                    onSeek={handleSegmentSeek}
                    onToggleBookmark={handleToggleBookmark}
                    registerRef={registerRef}
                  />
                );
              })
            )}
          </div>

          {/* Floating Re-center Badge */}
          {userHasScrolled && autoScrollEnabled && activeIndex >= 0 && (
            <button
              type="button"
              onClick={handleRecenter}
              className="absolute bottom-2 right-3 shadow-lg bg-primary hover:bg-orange-600 text-slate-950 font-bold text-[12px] px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer z-10"
            >
              <Target size={12} />
              <span>Re-center</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
