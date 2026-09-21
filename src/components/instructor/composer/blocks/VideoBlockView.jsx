"use client";

import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

import { resolveVideoSource } from "@/lib/videoSource";
import VideoSurface from "@/components/shared/video/VideoSurface";

export default function VideoBlockView({ block }) {
  const source = resolveVideoSource(block.url);
  const captionHtml = block.caption
    ? DOMPurify.sanitize(marked.parse(block.caption))
    : "";

  const isEmbed = source.kind === "youtube" || source.kind === "vimeo";

  return (
    <div className="space-y-3">
      {isEmbed && (
        <VideoSurface
          source={source}
          title="Video"
          className="relative w-full aspect-video overflow-hidden rounded-lg border border-border bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
        />
      )}
      {source.kind === "file" && (
        <VideoSurface
          source={source}
          title="Video"
          className="w-full"
          videoClassName="w-full max-h-[420px] rounded-lg bg-black"
        />
      )}
      {source.kind === "none" && (
        <p className="text-slate-600 text-sm">No video URL set</p>
      )}
      {source.kind === "invalid" && (
        <p className="text-slate-600 text-sm">
          This YouTube link has no video in it — paste the link to a single video
        </p>
      )}
      {captionHtml && (
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: captionHtml }}
        />
      )}
    </div>
  );
}
