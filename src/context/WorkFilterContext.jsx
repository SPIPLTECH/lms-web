"use client";

import { createContext, useContext, useState, useCallback } from "react";

const WorkFilterContext = createContext(null);

const INITIAL_FILTERS = {
  courseId: "",
  moduleId: "",
  lessonId: "",
  status: "",
  startDate: "",
  endDate: "",
};

/**
 * Holds the Course/Module/Lesson/Status/Date filter selection shared by
 * every page under /instructor/work — mounted once in work/layout.jsx so the
 * selection survives navigating between Work pages (Quiz -> Assessment, etc).
 *
 * Filters apply immediately on change (no separate Apply step) — `filters`
 * and `appliedFilters` are kept as two names pointing at the same value so
 * existing consumers reading either one keep working.
 */
export function WorkFilterProvider({ children }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "courseId") {
        next.moduleId = "";
        next.lessonId = "";
      }
      if (key === "moduleId") {
        next.lessonId = "";
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  return (
    <WorkFilterContext.Provider
      value={{ filters, appliedFilters: filters, updateFilter, resetFilters }}
    >
      {children}
    </WorkFilterContext.Provider>
  );
}

export function useWorkFilters() {
  const ctx = useContext(WorkFilterContext);
  if (!ctx) {
    throw new Error("useWorkFilters must be used within a WorkFilterProvider");
  }
  return ctx;
}
