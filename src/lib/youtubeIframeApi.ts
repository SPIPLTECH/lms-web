// Loads the YouTube IFrame Player API once per page and types the part of it
// the lesson player uses. Browser-only: call loadYouTubeIframeApi() from an
// effect or an event handler, never during render.

export interface YouTubePlayerEvent<T = unknown> {
  target: YouTubePlayer;
  data: T;
}

export interface YouTubeCaptionTrack {
  languageCode: string;
  displayName?: string;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoLoadedFraction(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  getPlaybackQuality(): string;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
  // Captions are driven through the player's module options. These calls are
  // not part of the documented API surface, so every use is feature-checked.
  getOptions?(module?: string): string[];
  getOption?(module: string, option: string): unknown;
  setOption?(module: string, option: string, value: unknown): void;
  loadModule?(module: string): void;
  unloadModule?(module: string): void;
}

export interface YouTubePlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent<number>) => void;
    onError?: (event: YouTubePlayerEvent<number>) => void;
    onPlaybackQualityChange?: (event: YouTubePlayerEvent<string>) => void;
    onPlaybackRateChange?: (event: YouTubePlayerEvent<number>) => void;
    onApiChange?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeNamespace {
  Player: new (target: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_ID = "youtube-iframe-api";
const SCRIPT_SRC = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 15000;

let apiPromise: Promise<YouTubeNamespace> | null = null;

/**
 * Resolves with the YT namespace once the IFrame API is ready. Every caller
 * shares one script tag and one promise; a failed load (offline, blocked,
 * timed out) clears both so a retry starts clean.
 */
export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube IFrame API can only load in the browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const fail = (message: string) => {
      window.clearTimeout(timer);
      apiPromise = null;
      document.getElementById(SCRIPT_ID)?.remove();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("Timed out loading the YouTube player."), LOAD_TIMEOUT_MS);

    // Chain rather than replace: another script may already be waiting on it.
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail("The YouTube player failed to initialise.");
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("error", () => fail("Could not reach YouTube."), { once: true });
  });

  return apiPromise;
}
