"use client";

import { Loader2, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { formatDuration } from "@/utils/formatDuration";

/**
 * The application's own control bar for a video, drawn below the media rather
 * than over it. It holds no playback state of its own and talks to no player:
 * every value is a prop and every gesture is a callback, so the same bar can
 * sit under a YouTube iframe (driven through the IFrame Player API) or under
 * anything else VideoSurface learns to play.
 *
 * It is deliberately *below* the frame, never on top of it. Overlaying a
 * third-party player's own surface is both forbidden by YouTube's embedded
 * player requirements and a good way to swallow clicks the player needs.
 *
 * Props:
 *   playerState   "unstarted" | "playing" | "buffering" | "paused" | "ended"
 *   currentTime / duration   seconds; duration 0 means "not known yet"
 *   volume        0–100
 *   isMuted
 *   onPlayPause / onReplay / onToggleMute / onFullscreen
 *   onVolumeChange(volume)
 *   onSeekPreview(seconds)   fired continuously while dragging (display only)
 *   onSeekCommit(seconds)    fired once on release — the only one that seeks
 */
export default function VideoControlBar({
    playerState = "unstarted",
    currentTime = 0,
    duration = 0,
    volume = 100,
    isMuted = false,
    onPlayPause,
    onReplay,
    onToggleMute,
    onVolumeChange,
    onSeekPreview,
    onSeekCommit,
    onFullscreen,
}) {
    const hasDuration = duration > 0;
    const isEnded = playerState === "ended";
    const isPlaying = playerState === "playing";
    const isBuffering = playerState === "buffering";

    const progressPercent = hasDuration
        ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
        : 0;
    const volumePercent = isMuted ? 0 : volume;

    // A filled track without a second element behind the input: the gradient
    // hard-stops at the current position.
    const trackStyle = (percent) => ({
        background: `linear-gradient(to right, rgb(255 255 255) ${percent}%, rgb(255 255 255 / 0.25) ${percent}%)`,
    });

    // border-0/p-0 because the app's global input styling gives every <input>
    // a border and 12px of padding, which on a border-box range turns a 4px
    // track into a 26px slab.
    const rangeClass =
        "h-1 w-full cursor-pointer appearance-none rounded-full border-0 p-0 outline-none " +
        "focus-visible:ring-2 focus-visible:ring-white/70 " +
        "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none " +
        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow " +
        "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full " +
        "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white";

    const buttonClass =
        "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/90 " +
        "transition hover:bg-white/15 hover:text-white focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40";

    return (
        <div className="flex w-full shrink-0 items-center gap-1.5 border-t border-white/10 bg-black/90 px-2 py-1.5 sm:gap-3 sm:px-3">
            <button
                type="button"
                onClick={isEnded ? onReplay : onPlayPause}
                className={buttonClass}
                aria-label={isEnded ? "Replay" : isPlaying ? "Pause" : "Play"}
            >
                {isBuffering ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : isEnded ? (
                    <RotateCcw className="size-4" />
                ) : isPlaying ? (
                    <Pause className="size-4 fill-current" />
                ) : (
                    <Play className="ml-0.5 size-4 fill-current" />
                )}
            </button>

            {/* One label rather than two, so the row keeps its width budget for
                the progress bar at 320px. tabular-nums stops the track from
                twitching as the digits change. */}
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/80 sm:text-xs">
                {formatDuration(Math.floor(currentTime))}
                <span className="mx-0.5 text-white/40">/</span>
                {hasDuration ? formatDuration(Math.floor(duration)) : "--:--"}
            </span>

            {/* The padding gives the thin track a finger-sized hit area. */}
            <div className="flex min-w-0 flex-1 items-center py-2">
                <input
                    type="range"
                    min={0}
                    max={hasDuration ? Math.floor(duration) : 0}
                    value={Math.floor(currentTime)}
                    disabled={!hasDuration}
                    onChange={(e) => onSeekPreview?.(Number(e.target.value))}
                    onPointerUp={(e) => onSeekCommit?.(Number(e.currentTarget.value))}
                    onKeyUp={(e) => onSeekCommit?.(Number(e.currentTarget.value))}
                    className={rangeClass}
                    style={trackStyle(progressPercent)}
                    aria-label="Seek"
                    aria-valuetext={`${formatDuration(Math.floor(currentTime))} of ${
                        hasDuration ? formatDuration(Math.floor(duration)) : "unknown"
                    }`}
                />
            </div>

            <button
                type="button"
                onClick={onToggleMute}
                className={buttonClass}
                aria-label={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Below sm the mute toggle is the whole volume story — a 16px-wide
                slider would be neither usable nor honest about its precision. */}
            <div className="hidden w-16 shrink-0 items-center py-2 sm:flex">
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={volumePercent}
                    onChange={(e) => onVolumeChange?.(Number(e.target.value))}
                    className={rangeClass}
                    style={trackStyle(volumePercent)}
                    aria-label="Volume"
                    aria-valuetext={`${volumePercent}%`}
                />
            </div>

            <button
                type="button"
                onClick={onFullscreen}
                className={buttonClass}
                aria-label="Full screen"
            >
                <Maximize className="size-4" />
            </button>
        </div>
    );
}
