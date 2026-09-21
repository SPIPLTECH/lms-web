'use client';

import { useState, useRef } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownEditor/MarkdownRenderer";
import { unescapeFromContentApi } from "@/lib/markdown";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Link as LinkIcon,
  FileCode,
  Presentation,
  ExternalLink,
} from "lucide-react";

import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import ActionMenu from "@/components/menus/ActionMenu";

import { useContent } from "@/hooks/queries/instructor/useContent";
import { useDeleteContent } from "@/hooks/queries/instructor/useDeleteContent";
import { useTopic } from "@/hooks/queries/instructor/useTopic";
import { useLesson } from "@/hooks/queries/instructor/useLesson";
import { useModule } from "@/hooks/queries/instructor/useModule";
import { useContents } from "@/hooks/queries/instructor/useContents";
import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import LessonStickySidebar from "@/components/instructor/lessons/LessonStickySidebar";
import { PdfViewer, PptViewer, ExternalDocumentViewer } from "@/components/shared/LazyDocumentViewers";
import { resolveVideoSource } from "@/lib/videoSource";
import VideoSurface from "@/components/shared/video/VideoSurface";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const TYPE_META = {
  VIDEO:        { icon: Video,        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20",  label: "Video" },
  DOCUMENT:     { icon: FileText,     color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",      label: "Document" },
  PRESENTATION: { icon: Presentation, color: "text-primary", bg: "bg-primary/10 border-primary/20",  label: "Presentation" },
  LINK:         { icon: LinkIcon,     color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20",label: "External Link" },
  TEXT:         { icon: FileCode,     color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",      label: "Text / HTML" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentDetailsPage() {
  const params   = useParams();
  const contentId = params.contentId;
  const router   = useRouter();

  // Video state. Playback is driven through the shared VideoSurface's handle
  // rather than a raw <video> ref, so the controls below work for an uploaded
  // file and for an embed alike.
  const videoRef = useRef(null);
  const [currentTime,  setCurrentTime]  = useState(0);

  const tabs = [
    { id: "description", label: "Description" },
    { id: "objectives",  label: "Learning Objectives" },
    { id: "attachments", label: "Attachments" },
  ];
  const [activeTab, setActiveTab] = useState("description");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: content, isLoading, isError } = useContent(contentId);
  const { data: topic }       = useTopic(content?.topicId, { enabled: !!content?.topicId });
  const { data: lesson }      = useLesson(topic?.lessonId, { enabled: !!topic?.lessonId });
  const { data: moduleData }  = useModule(lesson?.moduleId,  { enabled: !!lesson?.moduleId  });

  const topicId  = params.topicId || content?.topicId;
  const lessonId = params.lessonId || topic?.lessonId;
  const courseId = params.courseId || moduleData?.courseId;

  // Only course.title is rendered here, so the syllabus tree is skipped.
  const { data: course }       = useInstructorCourse(courseId, { shallow: true });
  const { data: contents = [] }= useContents(topicId, { enabled: !!topicId });
  const deleteContentMutation  = useDeleteContent();

  const currentIndex = contents.findIndex((c) => c.id === contentId);
  const prevContent  = currentIndex > 0 ? contents[currentIndex - 1] : null;
  const nextContent  = currentIndex < contents.length - 1 ? contents[currentIndex + 1] : null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${content?.title}"?`)) return;
    try {
      await deleteContentMutation.mutateAsync({ contentId, topicId: content.topicId });
      router.push(`/instructor/topics/${topicId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeekToSeconds = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.seekTo(seconds);
    setCurrentTime(seconds);
  };

  const navTo = (c) => {
    if (!c) return;
    router.push(`/instructor/contents/view/${c.id}`);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex justify-center py-20"><Loader /></div>;

  if (isError || !content)
    return (
      <Card>
        <div className="py-16 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Content Not Found</h2>
          <p className="mt-2 text-muted-foreground">Unable to load this content.</p>
        </div>
      </Card>
    );

  // ── Derived ─────────────────────────────────────────────────────────────────
  const type      = (content.type || "VIDEO").toUpperCase();
  const typeMeta  = TYPE_META[type] || TYPE_META.VIDEO;
  const TypeIcon  = typeMeta.icon;

  const isVideo        = type === "VIDEO";
  const isDocument     = type === "DOCUMENT";
  const isPresentation = type === "PRESENTATION";
  const isLink         = type === "LINK";
  const isText         = type === "TEXT";

  // One shared decision about how this row renders — the same one the student
  // learn page and the composer's video cell make.
  const videoSource = resolveVideoSource(content);

  const durationStr = content.duration
    ? formatTime(content.duration)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12 animate-fade-in duration-300">
      
      {/* 1. Header Navigation Bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/instructor/topics/${topicId}`)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#05070E] border border-border text-foreground hover:text-foreground hover:border-primary transition cursor-pointer"
              title="Back to Topic Details"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{content.title}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {course?.title || "Course"} &bull; {moduleData?.title || "Module"} &bull; {lesson?.title || "Lesson"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => router.push(`/instructor/contents/edit/${content.id}`)}
              className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-orange-600 px-4 py-2 text-xs font-black text-slate-950 transition shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
            <ActionMenu
              items={[
                {
                  label: "Delete Content",
                  onClick: handleDelete,
                }
              ]}
            />
          </div>
        </div>
      </div>

      {/* 2. Main Layout: media + tabs, plus a sticky rail for notes/queries/feedback/reviews */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1 min-w-0">

        {/* LEFT COLUMN: Media Preview Box */}
        <div className="rounded-2xl border border-transparent bg-[#0B101D] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-4 mb-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${typeMeta.bg} ${typeMeta.color}`}>
                <TypeIcon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  {/* Video is the exception: its title already appears in the page
                      header above, and repeating it directly over the player made the
                      embed read as a titled preview card rather than a player. */}
                  {!isVideo && (
                    <h2 className="text-xl font-bold text-foreground leading-tight">{content.title}</h2>
                  )}
                  <span className={`rounded-xl px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${typeMeta.bg} ${typeMeta.color}`}>
                    {typeMeta.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {content.description || "No description provided."}
                </p>
              </div>
              {durationStr && <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-auto">{durationStr}</span>}
            </div>

            {/* Video Player or Document/Presentation Preview Box */}
            {isVideo && (
              videoSource.kind === "invalid" ? (
                /* A YouTube link with no video id. The custom player below
                   would render a <video> pointing at a YouTube page, so say
                   what is wrong instead and show the link that is wrong. */
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
                  <p className="text-base font-semibold text-foreground">This YouTube link has no video in it</p>
                  <p className="text-sm text-muted-foreground">
                    Playlist and channel links can&apos;t be embedded. Paste the link to a single video.
                  </p>
                  <code className="mt-1 block max-w-full truncate rounded bg-muted px-2 py-1 text-[13px] text-muted-foreground">
                    {videoSource.url}
                  </code>
                </div>
              ) : (
                <VideoSurface
                  ref={videoRef}
                  source={videoSource}
                  nativeControls={false}
                  title={content.title || "Video"}
                  onTimeUpdate={setCurrentTime}
                  className="relative aspect-video w-full overflow-hidden rounded-2xl border border-transparent bg-black shadow-2xl [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:rounded-2xl [&_iframe]:border-0"
                  videoClassName="w-full h-full object-contain"
                />
              )
            )}

            {/* Presentation / Document Preview */}
            {(isPresentation || isDocument) && (
              content.fileUrl ? (
                <div className="w-full my-2">
                  {content.fileUrl.toLowerCase().includes(".pdf") ? (
                    <PdfViewer fileUrl={content.fileUrl.startsWith("http") ? content.fileUrl : `/api/blob-proxy?url=${encodeURIComponent(content.fileUrl)}`} title={content.title} />
                  ) : (content.fileUrl.toLowerCase().includes(".ppt") || content.fileUrl.toLowerCase().includes(".pptx")) && (content.fileUrl.includes("blob.vercel-storage.com") || content.fileUrl.includes("/content-uploads/")) ? (
                    <PptViewer fileUrl={content.fileUrl.startsWith("http") ? content.fileUrl : `/api/blob-proxy?url=${encodeURIComponent(content.fileUrl)}`} title={content.title} />
                  ) : (
                    <ExternalDocumentViewer fileUrl={content.fileUrl} title={content.title} />
                  )}
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-transparent bg-[#060913] flex flex-col items-center justify-center p-8 text-center my-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1.5">{content.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    No file has been uploaded for this {isPresentation ? "presentation" : "document"} yet.
                  </p>
                </div>
              )
            )}

            {/* External Link */}
            {isLink && (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-transparent bg-[#060913] flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <LinkIcon size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{content.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-md break-all">{content.externalUrl || "No URL provided"}</p>
                </div>
                {content.externalUrl && (
                  <a
                    href={content.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-5 py-3 transition active:scale-95"
                  >
                    <ExternalLink size={14} />
                    Open External Link
                  </a>
                )}
              </div>
            )}

            {/* Text / Markdown */}
            {isText && (
              <div className="rounded-2xl border border-transparent bg-[#060913] p-6 min-h-[240px]">
                <MarkdownRenderer
                  source={unescapeFromContentApi(content.htmlContent || "")}
                  emptyText="No text content provided."
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Content Details & Tabs */}
        <div className="rounded-2xl border border-transparent bg-[#0B101D] p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex border-b border-transparent gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-xs font-black tracking-wide uppercase transition cursor-pointer relative ${
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-6">
              {activeTab === "description" && (
                <div className="space-y-6">
                  <p className="text-foreground text-xs leading-relaxed">
                    {content.description || "No description provided for this content."}
                  </p>
                </div>
              )}

              {activeTab === "objectives" && (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Learning objectives haven't been added for this content yet.
                </div>
              )}

              {activeTab === "attachments" && (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  No extra attachment files attached to this lesson content.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT RAIL: Notes / Queries / Feedback / Reviews */}
      <div className="w-full xl:w-[380px] shrink-0">
        <LessonStickySidebar
          lessonId={lessonId}
          courseId={courseId}
          videoCurrentTime={currentTime}
          onSeekVideo={handleSeekToSeconds}
        />
      </div>

      </div>

      {/* 3. Bottom Navigation Row */}
      <div className="flex justify-between items-center pt-2">
        <button
          disabled={!prevContent}
          onClick={() => navTo(prevContent)}
          className={`flex items-center gap-2 rounded-xl border border-transparent bg-[#0B101D] px-5 py-2.5 text-xs font-bold text-foreground hover:text-foreground hover:border-transparent transition ${
            !prevContent && "opacity-40 cursor-not-allowed text-muted-foreground"
          }`}
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        <button
          disabled={!nextContent}
          onClick={() => navTo(nextContent)}
          className={`flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-orange-600 transition ${
            !nextContent && "opacity-40 cursor-not-allowed bg-primary/40 text-muted-foreground"
          }`}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
}