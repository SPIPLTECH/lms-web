"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { AlertTriangle, Loader2, Play, RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { getYouTubeVideoId } from "@/lib/youtube";
import { loadYouTubeIframeApi } from "@/lib/youtubeIframeApi";
import type { YouTubePlayer } from "@/lib/youtubeIframeApi";
import {
  pickPlaybackRates,
  resolveResumeTime,
  youtubeErrorKind,
  youtubeQualityLabel,
} from "@/lib/videoPlayback";
import VideoControls, { SKIP_SECONDS } from "./VideoControls";

/**
 * The lesson video player: Orange LMS controls over the YouTube IFrame Player
 * API. YouTube hosts and streams the video; this component only drives the
 * embedded player through its API and draws its own controls on top.
 *
 * It keeps the contract the previous YouTube embed in VideoPlayer.jsx had —
 * onTimeUpdate (whole seconds), onDurationChange, onEnded, initialTime and a
 * seekTo() handle — so the learn page's resume, sticky-note seeking and
 * completion-on-end keep working unchanged. It stores nothing itself.
 *
 * Not access control and not DRM: who may open a lesson is decided by the
 * backend, and an unlisted YouTube video stays reachable by its URL.
 */

type Phase = "idle" | "playing" | "paused" | "buffering" | "ended";
type ErrorKind = "invalid" | "unavailable" | "network" | "playback";

export interface OrangeVideoPlayerHandle {
  /** Jumps to a position and plays from it (sticky notes, transcript). */
  seekTo(seconds: number): void;
}

export interface OrangeVideoPlayerProps {
  videoUrl: string;
  title?: string;
  /** Position to resume from, in seconds. Read once, when the video loads. */
  initialTime?: number;
  onTimeUpdate?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
  onEnded?: () => void;
  className?: string;
}

const ERROR_COPY: Record<ErrorKind, { title: string; body: string; retry: boolean }> = {
  invalid: {
    title: "Unable to load this video.",
    body: "Please contact your instructor.",
    retry: false,
  },
  unavailable: {
    title: "This video is unavailable.",
    body: "It may have been removed or made private, or it is not allowed to play here. Please contact your instructor.",
    retry: false,
  },
  network: {
    title: "The video could not be loaded.",
    body: "Check your internet connection and try again.",
    retry: true,
  },
  playback: {
    title: "The video could not be played.",
    body: "Something went wrong during playback. Try again.",
    retry: true,
  },
};

const CONTROLS_HIDE_MS = 3000;
const POLL_MS = 250;
// How long a Play press may go unanswered before the click shield is lifted so
// the student can start the video with a tap on the embed itself (some mobile
// browsers only start a cross-origin player from a direct tap).
const START_FALLBACK_MS = 2500;
// How long the player keeps reporting its pre-seek position after seekTo().
const SEEK_SETTLE_MS = 600;

// YouTube draws its own chrome inside the embed — the title bar along the top,
// and "Watch on YouTube", the copy-link button, its logo and the "More videos"
// shelf along the bottom — and offers no parameter to turn any of it off. All
// of it is anchored to the iframe's top and bottom edges, so the iframe is
// made taller than the picture by this much of the picture's height on each
// side: the video letterboxes into the middle, the chrome lands in the
// overflow, and the player's own overflow-hidden clips it away. The picture
// itself is not cropped. (See chromeBleed for the one case it is lifted.)
const CHROME_BLEED = 1;
// The embed reports no dimensions, so the picture is laid out as the shape
// its kind of link implies: Shorts are vertical, everything else is 16:9.
const LANDSCAPE_ASPECT = 16 / 9;
const SHORTS_ASPECT = 9 / 16;

interface PictureBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

const ROOT_BASE =
  "relative isolate w-full h-full bg-black overflow-hidden max-xl:h-auto max-xl:aspect-video select-none [-webkit-tap-highlight-color:transparent]";

const noopSubscribe = () => () => {};
const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
};

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const fullscreenElementOf = (doc: FullscreenDocument) => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

function ErrorState({ kind, onRetry, className }: { kind: ErrorKind; onRetry?: () => void; className: string }) {
  const copy = ERROR_COPY[kind];
  return (
    <div className={`${className} flex items-center justify-center bg-card`} role="alert">
      <div className="flex max-w-sm flex-col items-center gap-2 p-6 text-center">
        <AlertTriangle className="h-9 w-9 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">{copy.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        {copy.retry && onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-2">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

interface SurfaceProps extends Omit<OrangeVideoPlayerProps, "videoUrl"> {
  videoId: string;
  aspect: number;
  onRetry: () => void;
}

const YouTubeSurface = forwardRef<OrangeVideoPlayerHandle, SurfaceProps>(function YouTubeSurface(
  { videoId, aspect, title, initialTime = 0, onTimeUpdate, onDurationChange, onEnded, onRetry, className = "" },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const [ready, setReady] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [started, setStarted] = useState(false);
  const [shieldLifted, setShieldLifted] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => resolveResumeTime(initialTime));
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>([1]);
  const [quality, setQuality] = useState<string | null>(null);
  const [captionsAvailable, setCaptionsAvailable] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // The settings menu portals into the player so it stays visible in fullscreen.
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(null);

  // Latest callbacks and flags for the player's event handlers, which are
  // bound once when the YouTube player is created.
  const callbacksRef = useRef({ onTimeUpdate, onDurationChange, onEnded });
  useEffect(() => {
    callbacksRef.current = { onTimeUpdate, onDurationChange, onEnded };
  }, [onTimeUpdate, onDurationChange, onEnded]);

  const startAtRef = useRef(resolveResumeTime(initialTime));
  const titleRef = useRef(title);
  const lastEmittedSecondRef = useRef(-1);
  const durationRef = useRef(0);
  const endedRef = useRef(false);
  const startedRef = useRef(false);
  const resumeCheckedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const captionsWantedRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const menuOpenRef = useRef(false);
  const soundRef = useRef({ volume: 100, muted: false });
  const timeRef = useRef(resolveResumeTime(initialTime));
  const seekSettlesAtRef = useRef(0);
  const lastPointerTypeRef = useRef("mouse");
  const controlsVisibleAtPressRef = useRef(true);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const startFallbackRef = useRef<number | undefined>(undefined);

  // Where the picture sits inside the player: the largest box of the video's
  // shape that fits, centred (so a frame that is not that shape — the desktop
  // lesson frame, fullscreen on a 16:10 screen — gets plain black bars).
  const [picture, setPicture] = useState<PictureBox | null>(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { clientWidth, clientHeight } = element;
      if (!clientWidth || !clientHeight) return;
      const width = Math.min(clientWidth, clientHeight * aspect);
      const height = width / aspect;
      setPicture({ width, height, left: (clientWidth - width) / 2, top: (clientHeight - height) / 2 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect]);

  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => {
      const doc = document as FullscreenDocument;
      return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
    },
    () => false
  );
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => {
      const current = fullscreenElementOf(document as FullscreenDocument);
      return current !== null && current === containerRef.current;
    },
    () => false
  );

  const emitTime = useCallback((seconds: number) => {
    const whole = Math.floor(seconds);
    if (whole === lastEmittedSecondRef.current) return;
    lastEmittedSecondRef.current = whole;
    callbacksRef.current.onTimeUpdate?.(whole);
  }, []);

  const noteDuration = useCallback((seconds: number) => {
    if (!(seconds > 0) || seconds === durationRef.current) return;
    durationRef.current = seconds;
    setDuration(seconds);
    callbacksRef.current.onDurationChange?.(seconds);
  }, []);

  const showControls = useCallback(() => {
    setControlsShown(true);
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current === "playing" && !menuOpenRef.current) setControlsShown(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  // Create the YouTube player. This surface is keyed by video (and retry), so
  // the effect runs once for the life of the component.
  useEffect(() => {
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let pollId: number | undefined;

    const sync = () => {
      if (!player) return;
      const time = player.getCurrentTime();
      noteDuration(player.getDuration());
      setBuffered(player.getVideoLoadedFraction());
      // Just after a seek the player still reports where it was.
      if (scrubbingRef.current || !Number.isFinite(time) || Date.now() < seekSettlesAtRef.current) return;
      timeRef.current = time;
      setCurrentTime(time);
      emitTime(time);
    };

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;

        // YT.Player replaces its target with the iframe, so it gets a node
        // React does not manage.
        const target = document.createElement("div");
        hostRef.current.replaceChildren(target);

        const setPlayerPhase = (next: Phase) => {
          phaseRef.current = next;
          setPhase(next);
        };

        player = new YT.Player(target, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            // Loads the captions module with the video, which is the only way
            // to learn whether it has caption tracks (see onApiChange).
            cc_load_policy: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            ...(startAtRef.current > 0 ? { start: startAtRef.current } : {}),
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const instance = event.target;
              const iframe = instance.getIframe();
              iframe.title = titleRef.current ? `Video: ${titleRef.current}` : "Lesson video";
              // Keyboard focus belongs to this player's own controls.
              iframe.tabIndex = -1;
              soundRef.current = { volume: instance.getVolume(), muted: instance.isMuted() };
              setVolume(soundRef.current.volume);
              setMuted(soundRef.current.muted);
              setRate(instance.getPlaybackRate());
              setRates(pickPlaybackRates(instance.getAvailablePlaybackRates()));
              noteDuration(instance.getDuration());
              setReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const instance = event.target;
              window.clearInterval(pollId);

              if (event.data === YT.PlayerState.PLAYING) {
                window.clearTimeout(startFallbackRef.current);
                endedRef.current = false;
                startedRef.current = true;
                setStarted(true);
                setShieldLifted(false);
                setPlayerPhase("playing");
                setRates(pickPlaybackRates(instance.getAvailablePlaybackRates()));
                setQuality(instance.getPlaybackQuality());
                // The duration is only known once playback starts. A saved
                // position in the video's last seconds restarts it rather
                // than resuming into the end.
                if (!resumeCheckedRef.current) {
                  resumeCheckedRef.current = true;
                  if (startAtRef.current > 0 && resolveResumeTime(startAtRef.current, instance.getDuration()) === 0) {
                    instance.seekTo(0, true);
                  }
                }
                sync();
                pollId = window.setInterval(sync, POLL_MS);
                showControls();
                return;
              }

              sync();
              if (event.data === YT.PlayerState.PAUSED) setPlayerPhase("paused");
              else if (event.data === YT.PlayerState.BUFFERING) setPlayerPhase("buffering");
              else if (event.data === YT.PlayerState.ENDED) {
                setPlayerPhase("ended");
                if (!endedRef.current) {
                  endedRef.current = true;
                  callbacksRef.current.onEnded?.();
                }
              } else setPlayerPhase("idle");
              setControlsShown(true);
            },
            onError: (event) => {
              if (cancelled) return;
              window.clearInterval(pollId);
              setErrorKind(youtubeErrorKind(event.data));
            },
            onPlaybackQualityChange: (event) => {
              if (!cancelled) setQuality(event.data);
            },
            onPlaybackRateChange: (event) => {
              if (!cancelled) setRate(event.data);
            },
            onApiChange: (event) => {
              if (cancelled) return;
              const instance = event.target;
              try {
                if (!instance.getOptions?.().includes("captions")) return;
                const tracks = instance.getOption?.("captions", "tracklist");
                if (!Array.isArray(tracks) || tracks.length === 0) return;
                setCaptionsAvailable(true);
                // Captions stay off until the student turns them on.
                if (!captionsWantedRef.current) instance.unloadModule?.("captions");
              } catch {
                // Caption options are best-effort; without them there is
                // simply no captions button.
              }
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setErrorKind("network");
      });

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearTimeout(hideTimerRef.current);
      window.clearTimeout(startFallbackRef.current);
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        // The iframe may already be gone (navigation, fullscreen teardown).
      }
    };
  }, [videoId, emitTime, noteDuration, showControls]);

  const seekAndTrack = useCallback(
    (seconds: number, allowSeekAhead = true) => {
      const player = playerRef.current;
      if (!player) return;
      const max = durationRef.current > 0 ? durationRef.current : Number.POSITIVE_INFINITY;
      const target = Math.min(Math.max(0, seconds), max);
      player.seekTo(target, allowSeekAhead);
      timeRef.current = target;
      seekSettlesAtRef.current = Date.now() + SEEK_SETTLE_MS;
      setCurrentTime(target);
      emitTime(target);
    },
    [emitTime]
  );

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (phaseRef.current === "ended") player.seekTo(0, true);
    player.playVideo();
    if (!startedRef.current) {
      window.clearTimeout(startFallbackRef.current);
      startFallbackRef.current = window.setTimeout(() => {
        if (!startedRef.current) setShieldLifted(true);
      }, START_FALLBACK_MS);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (phaseRef.current === "playing" || phaseRef.current === "buffering") player.pauseVideo();
    else play();
  }, [play]);

  const skip = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      if (!player) return;
      // From the last position this component knows, not getCurrentTime():
      // that lags a seek, so two quick presses would only move once.
      seekAndTrack(timeRef.current + delta);
      showControls();
    },
    [seekAndTrack, showControls]
  );

  const scrub = useCallback(
    (seconds: number, commit: boolean) => {
      // A commit with no drag before it is just focus leaving the slider.
      if (commit && !scrubbingRef.current) return;
      scrubbingRef.current = !commit;
      // While dragging, YouTube only seeks within what is already buffered;
      // the release is what may fetch a new part of the stream.
      seekAndTrack(seconds, commit);
      showControls();
    },
    [seekAndTrack, showControls]
  );

  // The player answers isMuted()/getVolume() from its last status message, so
  // straight after a mute()/setVolume() they still report the old value.
  // These refs are the sound state as this component last set it.
  const applySound = useCallback((nextVolume: number, nextMuted: boolean) => {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(nextVolume);
    if (nextMuted) player.mute();
    else player.unMute();
    soundRef.current = { volume: nextVolume, muted: nextMuted };
    setVolume(nextVolume);
    setMuted(nextMuted);
  }, []);

  const toggleMute = useCallback(() => {
    const { volume: current, muted: isMuted } = soundRef.current;
    // Unmuting a silent player has to be audible to mean anything.
    if (isMuted) applySound(current === 0 ? 50 : current, false);
    else applySound(current, true);
  }, [applySound]);

  const changeVolume = useCallback(
    (next: number) => {
      const clamped = Math.min(100, Math.max(0, next));
      applySound(clamped, clamped === 0);
    },
    [applySound]
  );

  // Arrow keys step from what is audible: a muted player counts as 0.
  const stepVolume = useCallback(
    (delta: number) => {
      const { volume: current, muted: isMuted } = soundRef.current;
      changeVolume((isMuted ? 0 : current) + delta);
    },
    [changeVolume]
  );

  const changeRate = useCallback((next: number) => {
    playerRef.current?.setPlaybackRate(next);
    setRate(next);
  }, []);

  const toggleCaptions = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const next = !captionsWantedRef.current;
    captionsWantedRef.current = next;
    try {
      if (next) player.loadModule?.("captions");
      else player.unloadModule?.("captions");
      setCaptionsOn(next);
    } catch {
      captionsWantedRef.current = !next;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current as FullscreenElement | null;
    if (!element) return;
    const doc = document as FullscreenDocument;
    if (fullscreenElementOf(doc)) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
    } else if (element.requestFullscreen) {
      void element.requestFullscreen().catch(() => {});
    } else {
      element.webkitRequestFullscreen?.();
    }
  }, []);

  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      menuOpenRef.current = open;
      setMenuOpen(open);
      if (!open) showControls();
    },
    [showControls]
  );

  useImperativeHandle(
    ref,
    () => ({
      seekTo(seconds: number) {
        seekAndTrack(seconds);
        play();
      },
    }),
    [seekAndTrack, play]
  );

  const controlsVisible = phase !== "playing" || controlsShown || menuOpen;

  const handleSurfaceClick = () => {
    // On touch, the first tap on a playing video only brings the controls
    // back; a tap with them showing (or any mouse click) toggles playback.
    if (lastPointerTypeRef.current !== "mouse" && phase === "playing" && !controlsVisibleAtPressRef.current) {
      showControls();
      return;
    }
    togglePlay();
    showControls();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || menuOpenRef.current) return;
    const tag = (event.target as HTMLElement).tagName;
    // Sliders and buttons keep their own keys (arrows, Space, Enter).
    if (tag === "INPUT") return;
    const onButton = tag === "BUTTON";

    switch (event.key) {
      case " ":
      case "k":
      case "K":
        if (onButton && event.key === " ") return;
        togglePlay();
        break;
      case "ArrowLeft":
      case "j":
      case "J":
        skip(-SKIP_SECONDS);
        break;
      case "ArrowRight":
      case "l":
      case "L":
        skip(SKIP_SECONDS);
        break;
      case "ArrowUp":
        stepVolume(5);
        break;
      case "ArrowDown":
        stepVolume(-5);
        break;
      case "m":
      case "M":
        toggleMute();
        break;
      case "f":
      case "F":
        if (!canFullscreen) return;
        toggleFullscreen();
        break;
      case "c":
      case "C":
        if (!captionsAvailable) return;
        toggleCaptions();
        break;
      default:
        return;
    }
    event.preventDefault();
    showControls();
  };

  if (errorKind) {
    return <ErrorState kind={errorKind} onRetry={onRetry} className={`${ROOT_BASE} ${className}`} />;
  }

  // YouTube also anchors captions to the embed's bottom edge, so the bleed
  // would hide them with the chrome. While captions are on and the video is
  // actually playing — when YouTube draws no chrome of its own — the embed is
  // the picture's exact size; the moment it pauses or ends, the bleed is back.
  const chromeBleed = captionsOn && (phase === "playing" || phase === "buffering") ? 0 : CHROME_BLEED;

  const showBigButton = ready && !shieldLifted && (phase === "idle" || phase === "paused" || phase === "ended");

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={title ? `Video player: ${title}` : "Video player"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        // Hover is a mouse idea; a touch reveals the controls by tapping.
        if (event.pointerType === "mouse") showControls();
      }}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        lastPointerTypeRef.current = event.pointerType;
        // Captured before the tap itself can change it (see handleSurfaceClick).
        controlsVisibleAtPressRef.current = controlsVisible;
      }}
      onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "mouse") return;
        if (phaseRef.current === "playing" && !menuOpenRef.current) setControlsShown(false);
      }}
      className={`${ROOT_BASE} group/player touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
        controlsVisible ? "" : "cursor-none"
      } ${className}`}
    >
      {/* The YouTube iframe, taller than the picture so YouTube's own chrome
          falls outside the player and is clipped (see CHROME_BLEED). */}
      <div
        ref={hostRef}
        style={
          picture
            ? {
                left: picture.left,
                width: picture.width,
                top: picture.top - picture.height * chromeBleed,
                height: picture.height * (1 + 2 * chromeBleed),
              }
            : { inset: 0 }
        }
        className="absolute [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full"
      />

      {/* Before the first play the embed shows YouTube's thumbnail with its
          own red play button in the middle of the picture, where the bleed
          cannot reach. The same thumbnail is drawn over it so the only play
          button is this player's. Dropped if the start has to fall back to a
          tap on the embed itself.

          Two layers: the full-size thumbnail, which older or low-resolution
          videos do not have, over the standard one every video has. That one
          is 4:3 with the bars baked in, which bg-cover crops back off. */}
      {ready && !started && !shieldLifted && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black">
          {picture && (
            <div
              className="absolute bg-cover bg-center bg-no-repeat"
              style={{
                left: picture.left,
                top: picture.top,
                width: picture.width,
                height: picture.height,
                backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg), url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`,
              }}
            />
          )}
        </div>
      )}

      {/* Click shield: every tap on the picture is a play/pause for this
          player, instead of a click on the embed (which opens YouTube). */}
      {ready && !shieldLifted && (
        <div
          aria-hidden="true"
          onClick={handleSurfaceClick}
          onDoubleClick={() => {
            if (canFullscreen && lastPointerTypeRef.current === "mouse") toggleFullscreen();
          }}
          className="absolute inset-0 z-10"
        />
      )}

      {/* Loading skeleton — holds the frame so nothing shifts when the video arrives. */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted" role="status">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-card to-muted" aria-hidden="true" />
          <Loader2 className="relative h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <span className="relative text-sm font-medium text-muted-foreground">Loading video…</span>
        </div>
      )}

      {ready && phase === "buffering" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" role="status">
          <Loader2 className="h-10 w-10 animate-spin text-white drop-shadow" aria-hidden="true" />
          <span className="sr-only">Buffering</span>
        </div>
      )}

      {showBigButton && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              play();
              showControls();
            }}
            aria-label={phase === "ended" ? "Replay video" : "Play video"}
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full! bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 sm:h-20 sm:w-20 cursor-pointer"
          >
            {phase === "ended" ? (
              <RotateCcw className="h-7 w-7 sm:h-8 sm:w-8" />
            ) : (
              <Play className="h-7 w-7 translate-x-0.5 sm:h-9 sm:w-9" fill="currentColor" />
            )}
          </button>
        </div>
      )}

      {shieldLifted && !started && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
          <span className="rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white" role="status">
            Tap the video to start
          </span>
        </div>
      )}

      {/* Control bar. focus-within keeps it up for keyboard users while the video plays. */}
      {ready && (
        <div
          className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/55 to-transparent transition-opacity duration-200 focus-within:opacity-100 focus-within:pointer-events-auto ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <VideoControls
            isPlaying={phase === "playing" || phase === "buffering"}
            currentTime={currentTime}
            duration={duration}
            bufferedFraction={buffered}
            volume={volume}
            muted={muted}
            rate={rate}
            rates={rates}
            qualityLabel={youtubeQualityLabel(quality)}
            captionsAvailable={captionsAvailable}
            captionsOn={captionsOn}
            canFullscreen={canFullscreen}
            isFullscreen={isFullscreen}
            menuContainer={menuContainer}
            onTogglePlay={togglePlay}
            onSkip={skip}
            onScrub={scrub}
            onToggleMute={toggleMute}
            onVolumeChange={changeVolume}
            onRateChange={changeRate}
            onToggleCaptions={toggleCaptions}
            onToggleFullscreen={toggleFullscreen}
            onMenuOpenChange={handleMenuOpenChange}
          />
        </div>
      )}

      <div ref={setMenuContainer} />
    </div>
  );
});

const OrangeVideoPlayer = forwardRef<OrangeVideoPlayerHandle, OrangeVideoPlayerProps>(function OrangeVideoPlayer(
  { videoUrl, className = "", ...surfaceProps },
  ref
) {
  const videoId = getYouTubeVideoId(videoUrl);
  const [attempt, setAttempt] = useState(0);

  if (!videoId) {
    return <ErrorState kind="invalid" className={`${ROOT_BASE} ${className}`} />;
  }

  // Keyed by video and retry: a different video, or "Try again", starts from
  // a clean player rather than resetting a dozen pieces of state by hand.
  return (
    <YouTubeSurface
      key={`${videoId}:${attempt}`}
      aspect={videoUrl.toLowerCase().includes("/shorts/") ? SHORTS_ASPECT : LANDSCAPE_ASPECT}
      ref={ref}
      videoId={videoId}
      className={className}
      onRetry={() => setAttempt((count) => count + 1)}
      {...surfaceProps}
    />
  );
});

export default OrangeVideoPlayer;
