/** How a stored video renders. See src/lib/videoSource.js for the rules. */
export interface VideoSource {
  /** "invalid" is a YouTube link carrying no readable video id. */
  kind: "youtube" | "vimeo" | "file" | "invalid" | "none";
  url?: string;
  /** "youtube" only. */
  videoId?: string;
  /** "youtube" / "vimeo" only. */
  embedUrl?: string;
  /** "file" only — display-ready (blob-proxied / origin-resolved). */
  src?: string;
}

export declare const YOUTUBE_EMBED_HOST: string;

export declare function getYouTubeEmbedParams(
  videoId: string,
  options?: { start?: number }
): Record<string, string | number>;

/** Accepts a Content row or a bare URL. */
export declare function resolveVideoSource(
  input: string | { videoUrl?: string | null; fileUrl?: string | null; externalUrl?: string | null } | null | undefined
): VideoSource;

/** True when the source can drive an application-controlled player. */
export declare function isAppControllable(source: VideoSource | null | undefined): boolean;
