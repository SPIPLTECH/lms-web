"use client";

import { useMutation } from "@tanstack/react-query";
import { previewQuestionImport } from "@/services/question.service";

/** Reads a question file for review. Nothing is saved, so no cached data goes stale. */
export function usePreviewQuestionImport() {
  return useMutation({
    mutationFn: (file) => previewQuestionImport(file),
    meta: { refreshAll: false },
  });
}
