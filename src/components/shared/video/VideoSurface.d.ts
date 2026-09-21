import type * as React from "react";
import type { VideoSource } from "@/lib/videoSource";

export type { VideoSource };

/** Playback controls a caller drives the surface with, for either source kind. */
export interface VideoSurfaceHandle {
  seekTo(seconds: number): void;
  play(): void;
  pause(): void;
  setMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;
  requestFullscreen(): void;
}

export interface VideoSurfaceProps {
  source: VideoSource;
  /** Classes for the frame element; sizing belongs to the caller. */
  className?: string;
  /** Classes for the <video> element in the "file" case. */
  videoClassName?: string;
  initialTime?: number;
  /** false when the caller draws its own control bar and drives it via the ref. */
  nativeControls?: boolean;
  title?: string;
  onTimeUpdate?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
  onEnded?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onError?: () => void;
}

declare const VideoSurface: React.ForwardRefExoticComponent<
  VideoSurfaceProps & React.RefAttributes<VideoSurfaceHandle>
>;

export default VideoSurface;
