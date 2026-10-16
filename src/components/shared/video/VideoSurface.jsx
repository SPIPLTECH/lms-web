"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { YOUTUBE_EMBED_HOST, getYouTubeEmbedParams } from "@/lib/videoSource";
import VideoControlBar from "./VideoControlBar";

/**
 * The one video renderer in the app. Student learn page, the composer's video
 * cell, the instructor content detail page and the composer block view all
 * draw their video through this, so a video behaves identically wherever it
 * appears and there is one place to fix when it doesn't.
 *
 * It renders the player and nothing else — no title, no share control, no
 * external link, no card. Whatever frames it (a lesson header, a composer
 * cell shell) belongs to the caller.
 *
 * ── The YouTube case ─────────────────────────────────────────────────────
 * The media engine is YouTube's iframe; the shell around it is ours. The
 * player runs with controls=0 and the application draws its own control bar
 * (VideoControlBar) below the frame, driving playback exclusively through the
 * official IFrame Player API — playVideo, pauseVideo, seekTo, mute, unMute,
 * setVolume — and mirroring the player's real state out of its events and
 * getCurrentTime/getDuration. Nothing here reads the iframe's document,
 * injects styles into it, or positions anything over it; YouTube's embedded
 * player requirements forbid obscuring the player, and none of it is possible
 * cross-origin anyway.
 *
 * What stays YouTube's: everything rendered inside the frame. In practice
 * that is the poster state — video title, channel, share control and the
 * "Watch on YouTube" link — which is why the player is not created until
 * someone presses play (see isActivated below) and our own thumbnail stands
 * in until then. Captions, quality and any in-frame messaging remain
 * YouTube's to draw. Do not add "fixes" reaching into the frame.
 *
 * Props:
 *   source          resolveVideoSource() result — the only accepted input.
 *   className       classes for the frame element (sizing is the caller's).
 *   videoClassName  classes for the <video> element in the "file" case.
 *   initialTime     seconds to resume from.
 *   nativeControls  show the browser's own <video> controls (default true).
 *                   Pass false when the caller draws its own control bar and
 *                   drives playback through this component's ref.
 *   onTimeUpdate(seconds) / onDurationChange(seconds) / onEnded()
 *   onPlayingChange(isPlaying) / onError()
 *
 * Ref: { seekTo, play, pause, setMuted, setPlaybackRate, requestFullscreen }
 */
const VideoSurface = forwardRef(function VideoSurface(
    {
        source,
        className = "",
        videoClassName = "",
        initialTime = 0,
        nativeControls = false,
        title,
        onTimeUpdate,
        onDurationChange,
        onEnded,
        onPlayingChange,
        onError,
    },
    ref
) {
    const kind = source?.kind ?? "none";
    const isYoutube = kind === "youtube";

    const containerRef = useRef(null);
    const playerRef = useRef(null);
    const localVideoRef = useRef(null);
    // The whole shell — media plus our control bar — so full screen takes the
    // controls with it instead of leaving them behind on the page.
    const frameRef = useRef(null);

    // Playback state mirrored out of the IFrame Player API for our own control
    // bar. Every value here is read from the player (getCurrentTime,
    // getDuration, getVolume); none of it is a timer pretending to be
    // playback, so scrubbing inside YouTube's own UI still moves our bar.
    const [playerState, setPlayerState] = useState("unstarted");
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    // While a drag is in flight the poll must not yank the handle back to the
    // player's position, and we must not call seekTo on every pixel.
    const isScrubbingRef = useRef(false);

    // A seek that arrived before the player existed, applied once it is ready.
    const pendingSeekRef = useRef(null);

    // A different video is a different, unstarted surface.
    useEffect(() => {
        pendingSeekRef.current = null;
        setPlayerState("unstarted");
        setCurrentTime(0);
        setDuration(0);
    }, [source?.url, source?.videoId]);

    // Callbacks are read through refs so that a caller passing a fresh inline
    // function on every render cannot tear down and rebuild the YouTube
    // player — which would restart the video mid-lesson.
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onEndedRef = useRef(onEnded);
    const onDurationChangeRef = useRef(onDurationChange);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const initialTimeRef = useRef(initialTime);

    useEffect(() => {
        onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);
    useEffect(() => {
        onEndedRef.current = onEnded;
    }, [onEnded]);
    useEffect(() => {
        onDurationChangeRef.current = onDurationChange;
    }, [onDurationChange]);
    useEffect(() => {
        onPlayingChangeRef.current = onPlayingChange;
    }, [onPlayingChange]);
    useEffect(() => {
        initialTimeRef.current = initialTime;
    }, [source?.url, initialTime]);

    useImperativeHandle(
        ref,
        () => ({
            seekTo(seconds) {
                if (isYoutube) {
                    if (!playerRef.current) {
                        pendingSeekRef.current = seconds;
                        return;
                    }
                    playerRef.current?.seekTo?.(seconds, true);
                    playerRef.current?.playVideo?.();
                } else if (localVideoRef.current) {
                    localVideoRef.current.currentTime = seconds;
                    localVideoRef.current.play?.().catch(() => {});
                }
            },
            play() {
                if (isYoutube) {
                    playerRef.current?.playVideo?.();
                } else {
                    localVideoRef.current?.play?.().catch(() => {});
                }
            },
            pause() {
                if (isYoutube) {
                    playerRef.current?.pauseVideo?.();
                } else {
                    localVideoRef.current?.pause?.();
                }
            },
            setMuted(muted) {
                setIsMuted(muted);
                if (isYoutube) {
                    if (muted) playerRef.current?.mute?.();
                    else playerRef.current?.unMute?.();
                } else if (localVideoRef.current) {
                    localVideoRef.current.muted = muted;
                }
            },
            setPlaybackRate(rate) {
                if (isYoutube) {
                    playerRef.current?.setPlaybackRate?.(rate);
                } else if (localVideoRef.current) {
                    localVideoRef.current.playbackRate = rate;
                }
            },
            requestFullscreen() {
                const el = frameRef.current || localVideoRef.current;
                el?.requestFullscreen?.();
            },
        }),
        [isYoutube]
    );

    // YouTube IFrame API — the supported way to drive an embed, which is what
    // makes progress tracking and seek-to-timestamp possible at all.
    useEffect(() => {
        if (!isYoutube || !source?.videoId) return;

        let player;
        let intervalId;

        // Reads the player rather than counting: our bar shows where YouTube
        // actually is, including after a seek we did not initiate.
        const syncFromPlayer = () => {
            if (!player || typeof player.getCurrentTime !== "function") return;
            const total = player.getDuration?.() ?? 0;
            if (total > 0) setDuration(total);
            if (!isScrubbingRef.current) {
                const at = player.getCurrentTime() ?? 0;
                setCurrentTime(at);
                onTimeUpdateRef.current?.(Math.floor(at));
            }
        };

        const startPolling = () => {
            clearInterval(intervalId);
            intervalId = setInterval(syncFromPlayer, 250);
        };

        const onPlayerStateChange = (event) => {
            const YTStates = window.YT.PlayerState;

            if (event.data === YTStates.PLAYING) {
                setPlayerState("playing");
                onPlayingChangeRef.current?.(true);
                if (player && typeof player.getDuration === "function") {
                    const total = player.getDuration();
                    if (total > 0) setDuration(total);
                    onDurationChangeRef.current?.(total);
                }
                startPolling();
            } else if (event.data === YTStates.BUFFERING) {
                setPlayerState("buffering");
                syncFromPlayer();
            } else if (event.data === YTStates.ENDED) {
                clearInterval(intervalId);
                setPlayerState("ended");
                if (player?.getDuration) setCurrentTime(player.getDuration());
                onPlayingChangeRef.current?.(false);
                onEndedRef.current?.();
            } else if (event.data === YTStates.PAUSED) {
                clearInterval(intervalId);
                setPlayerState("paused");
                syncFromPlayer();
                onPlayingChangeRef.current?.(false);
            } else {
                clearInterval(intervalId);
                setPlayerState("unstarted");
                onPlayingChangeRef.current?.(false);
            }
        };

        const initializePlayer = () => {
            if (!containerRef.current) return;
            containerRef.current.innerHTML = "";
            const target = document.createElement("div");
            target.className = "w-full h-full";
            containerRef.current.appendChild(target);
            player = new window.YT.Player(target, {
                host: YOUTUBE_EMBED_HOST,
                height: "100%",
                width: "100%",
                videoId: source.videoId,
                playerVars: {
                    ...getYouTubeEmbedParams(source.videoId, {
                        start: initialTimeRef.current || 0,
                    }),
                    autoplay: 0,
                },
                events: {
                    onReady: () => {
                        if (pendingSeekRef.current != null) {
                            player.seekTo?.(pendingSeekRef.current, true);
                            pendingSeekRef.current = null;
                        }
                        const total = player.getDuration?.() ?? 0;
                        if (total > 0) setDuration(total);
                        setVolume(player.getVolume?.() ?? 100);
                        setIsMuted(Boolean(player.isMuted?.()));
                    },
                    onStateChange: onPlayerStateChange,
                },
            });
            playerRef.current = player;
        };

        if (window.YT && window.YT.Player) {
            initializePlayer();
        } else {
            if (!document.getElementById("youtube-iframe-api")) {
                const tag = document.createElement("script");
                tag.id = "youtube-iframe-api";
                tag.src = "https://www.youtube.com/iframe_api";
                document.body.appendChild(tag);
            }

            const checkTimer = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkTimer);
                    initializePlayer();
                }
            }, 100);

            return () => {
                clearInterval(checkTimer);
                clearInterval(intervalId);
                if (playerRef.current && typeof playerRef.current.destroy === "function") {
                    playerRef.current.destroy();
                }
                playerRef.current = null;
            };
        }

        return () => {
            clearInterval(intervalId);
            if (playerRef.current && typeof playerRef.current.destroy === "function") {
                playerRef.current.destroy();
            }
            playerRef.current = null;
        };
    }, [source?.videoId, isYoutube]);

    // ── Control-bar intents → IFrame Player API / HTML5 Video ───────────────
    const handlePlayPause = () => {
        if (isYoutube) {
            const player = playerRef.current;
            if (!player) return;
            if (playerState === "playing" || playerState === "buffering") {
                player.pauseVideo?.();
            } else {
                player.playVideo?.();
            }
        } else if (localVideoRef.current) {
            if (localVideoRef.current.paused) {
                localVideoRef.current.play?.().catch(() => {});
            } else {
                localVideoRef.current.pause?.();
            }
        }
    };

    const handleReplay = () => {
        if (isYoutube) {
            const player = playerRef.current;
            if (!player) return;
            player.seekTo?.(0, true);
            player.playVideo?.();
        } else if (localVideoRef.current) {
            localVideoRef.current.currentTime = 0;
            localVideoRef.current.play?.().catch(() => {});
        }
    };

    const handleSeekPreview = (seconds) => {
        isScrubbingRef.current = true;
        setCurrentTime(seconds);
    };

    const handleSeekCommit = (seconds) => {
        if (!isScrubbingRef.current) return;
        isScrubbingRef.current = false;
        setCurrentTime(seconds);
        if (isYoutube) {
            playerRef.current?.seekTo?.(seconds, true);
        } else if (localVideoRef.current) {
            localVideoRef.current.currentTime = seconds;
        }
        onTimeUpdateRef.current?.(Math.floor(seconds));
    };

    const handleToggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        if (isYoutube) {
            const player = playerRef.current;
            if (!player) return;
            if (next) player.mute?.();
            else player.unMute?.();
        } else if (localVideoRef.current) {
            localVideoRef.current.muted = next;
        }
    };

    const handleVolumeChange = (nextVolume) => {
        setVolume(nextVolume);
        if (isYoutube) {
            const player = playerRef.current;
            player?.setVolume?.(nextVolume);
            if (nextVolume === 0 && !isMuted) {
                setIsMuted(true);
                player?.mute?.();
            } else if (nextVolume > 0 && isMuted) {
                setIsMuted(false);
                player?.unMute?.();
            }
        } else if (localVideoRef.current) {
            localVideoRef.current.volume = nextVolume / 100;
            if (nextVolume === 0 && !isMuted) {
                setIsMuted(true);
                localVideoRef.current.muted = true;
            } else if (nextVolume > 0 && isMuted) {
                setIsMuted(false);
                localVideoRef.current.muted = false;
            }
        }
    };

    const handleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else (frameRef.current || localVideoRef.current)?.requestFullscreen?.();
    };

    // Resume position for our own media.
    useEffect(() => {
        const videoEl = localVideoRef.current;
        if (!videoEl || kind !== "file") return;

        const applyInitialTime = () => {
            if (initialTimeRef.current > 0) {
                videoEl.currentTime = initialTimeRef.current;
            }
        };

        if (videoEl.readyState >= 1) {
            applyInitialTime();
        } else {
            videoEl.addEventListener("loadedmetadata", applyInitialTime);
            return () => videoEl.removeEventListener("loadedmetadata", applyInitialTime);
        }
    }, [source?.src, kind]);

    if (kind === "none" || kind === "invalid") return null;

    if (isYoutube) {
        return (
            <div ref={frameRef} className={`${className} flex flex-col`}>
                <div ref={containerRef} className="relative min-h-0 w-full flex-1 bg-black" />

                <VideoControlBar
                    playerState={playerState}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    onPlayPause={handlePlayPause}
                    onReplay={handleReplay}
                    onSeekPreview={handleSeekPreview}
                    onSeekCommit={handleSeekCommit}
                    onToggleMute={handleToggleMute}
                    onVolumeChange={handleVolumeChange}
                    onFullscreen={handleFullscreen}
                />
            </div>
        );
    }

    if (kind === "vimeo") {
        return (
            <div className={className}>
                <iframe
                    src={source.embedUrl}
                    title={title || "Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                />
            </div>
        );
    }

    if (!nativeControls) {
        return (
            <div ref={frameRef} className={`${className} flex flex-col`}>
                <div className="relative min-h-0 w-full flex-1 bg-black flex items-center justify-center">
                    <video
                        ref={localVideoRef}
                        src={source.src}
                        controls={false}
                        preload="metadata"
                        playsInline
                        onError={onError}
                        onPlay={() => {
                            setPlayerState("playing");
                            onPlayingChangeRef.current?.(true);
                        }}
                        onPause={() => {
                            setPlayerState("paused");
                            onPlayingChangeRef.current?.(false);
                        }}
                        onWaiting={() => setPlayerState("buffering")}
                        onEnded={() => {
                            setPlayerState("ended");
                            onPlayingChangeRef.current?.(false);
                            onEndedRef.current?.();
                        }}
                        onLoadedMetadata={(event) => {
                            const d = event.currentTarget.duration || 0;
                            setDuration(d);
                            onDurationChangeRef.current?.(d);
                        }}
                        onTimeUpdate={(event) => {
                            const at = event.currentTarget.currentTime || 0;
                            if (!isScrubbingRef.current) {
                                setCurrentTime(at);
                            }
                            onTimeUpdateRef.current?.(Math.floor(at));
                        }}
                        className={videoClassName || "w-full h-full object-contain"}
                    />
                </div>

                <VideoControlBar
                    playerState={playerState}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    onPlayPause={handlePlayPause}
                    onReplay={handleReplay}
                    onSeekPreview={handleSeekPreview}
                    onSeekCommit={handleSeekCommit}
                    onToggleMute={handleToggleMute}
                    onVolumeChange={handleVolumeChange}
                    onFullscreen={handleFullscreen}
                />
            </div>
        );
    }

    return (
        <div className={className}>
            <video
                ref={localVideoRef}
                src={source.src}
                controls={nativeControls}
                preload="metadata"
                playsInline
                onError={onError}
                onPlay={() => onPlayingChangeRef.current?.(true)}
                onPause={() => onPlayingChangeRef.current?.(false)}
                onEnded={() => {
                    onPlayingChangeRef.current?.(false);
                    onEndedRef.current?.();
                }}
                onLoadedMetadata={(event) =>
                    onDurationChangeRef.current?.(event.currentTarget.duration)
                }
                onTimeUpdate={(event) =>
                    onTimeUpdateRef.current?.(Math.floor(event.currentTarget.currentTime))
                }
                className={videoClassName}
            />
        </div>
    );
});

export default VideoSurface;

