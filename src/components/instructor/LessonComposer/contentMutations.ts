import type { UseMutationResult } from "@tanstack/react-query";

import { useCreateContent as useCreateContentBase } from "@/hooks/queries/instructor/useCreateContent";
import { useUpdateContent as useUpdateContentBase } from "@/hooks/queries/instructor/useUpdateContent";
import { useDeleteContent as useDeleteContentBase } from "@/hooks/queries/instructor/useDeleteContent";

import type { ContentType } from "./cellTypes";
import { getContentParent, toParentField, type ContentParent, type ContentRow } from "./types";

export interface CreateContentVariables {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  topicId?: string;
  subTopicId?: string;
  conceptId?: string;
  type: ContentType;
  order: number;
  title?: string;
  videoUrl?: string;
  fileUrl?: string;
  htmlContent?: string;
  externalUrl?: string;
  duration?: number;
  data?: Record<string, unknown> | null;
}

export interface UpdateContentVariables {
  contentId: string;
  contentData: Record<string, unknown>;
  parent: ContentParent;
}

export interface DeleteContentVariables {
  contentId: string;
  parent: ContentParent;
}

/** `useCreateContent`'s `mutationFn` is a plain function reference (not a destructured inline arrow), so unlike the two below, React Query infers its variable type fine across the JS/TS boundary — this wrapper exists only for a consistent import path alongside them. */
export function useCreateContent(): UseMutationResult<unknown, unknown, CreateContentVariables> {
  return useCreateContentBase() as unknown as UseMutationResult<unknown, unknown, CreateContentVariables>;
}

/**
 * `useUpdateContent`/`useDeleteContent` (src/hooks/queries/instructor/) are
 * plain JS hooks shared with several existing pages. Because their
 * `mutationFn` takes a destructured, untyped parameter, React Query can't
 * infer a `TVariables` type across the JS/TS boundary and falls back to
 * `void`, which then rejects the object arguments these mutations actually
 * expect. These thin wrappers add the missing type via a cast, without
 * touching — or duplicating the behavior of — the original hooks.
 */
export function useUpdateContent(): UseMutationResult<unknown, unknown, UpdateContentVariables> {
  return useUpdateContentBase() as unknown as UseMutationResult<unknown, unknown, UpdateContentVariables>;
}

export function useDeleteContent(): UseMutationResult<unknown, unknown, DeleteContentVariables> {
  return useDeleteContentBase() as unknown as UseMutationResult<unknown, unknown, DeleteContentVariables>;
}

/** Copies every content field a `Content` row might have — safe to call for any cell type, since only the fields that type actually uses ever end up non-null on the source row. */
function buildDuplicatePayload(content: ContentRow, order: number): CreateContentVariables {
  return {
    ...toParentField(getContentParent(content)),
    type: content.type as ContentType,
    order,
    title: content.title ? `${content.title} (Copy)` : undefined,
    videoUrl: content.videoUrl ?? undefined,
    fileUrl: content.fileUrl ?? undefined,
    htmlContent: content.htmlContent ?? undefined,
    externalUrl: content.externalUrl ?? undefined,
    duration: content.duration ?? undefined,
  };
}

/** Duplicates an existing Content row via the same `createContent` call the Add Cell forms use — no separate "duplicate" endpoint exists or is needed. */
export function useDuplicateContent() {
  const createContent = useCreateContent();
  return {
    duplicate: (content: ContentRow, order: number) => createContent.mutateAsync(buildDuplicatePayload(content, order)),
    isPending: createContent.isPending,
  };
}
