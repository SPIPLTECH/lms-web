"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

/** Reusable page controls + rows-per-page selector for any server-paginated list. */
export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }) {
  // A caller may page in a size that isn't one of the standard options — a
  // card grid pages in 12s, for instance. Fold it in so the selector shows the
  // size actually in use instead of rendering an empty box.
  const options = ROWS_PER_PAGE_OPTIONS.includes(limit)
    ? ROWS_PER_PAGE_OPTIONS
    : [...ROWS_PER_PAGE_OPTIONS, limit].sort((a, b) => a - b);

  return (
    <div className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Rows per page</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="bg-background border border-border rounded-lg px-2 py-1 text-foreground outline-none focus:border-primary/50 [&>option]:bg-card [&>option]:text-foreground"
        >
          {options.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="hidden sm:inline">• {total} total</span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted disabled:opacity-30 transition"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted disabled:opacity-30 transition"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
