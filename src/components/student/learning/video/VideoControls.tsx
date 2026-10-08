"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Captions,
  CaptionsOff,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { formatVideoTime } from "@/lib/videoPlayback";

export const SKIP_SECONDS = 10;

// The controls sit on the video, not on a page surface, so they are white on a
// dark scrim in both themes; the accent is the theme's --primary, lightened to
// stay legible against dark footage.
const ACCENT = "color-mix(in oklab, var(--primary) 78%, white)";

// 44px on touch-sized screens, 40px from sm up. (rounded-full! because
// globals.css sets a button radius from an unlayered rule.)
const ICON_BUTTON =
  "inline-flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full! text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer disabled:opacity-40 disabled:pointer-events-none";

// globals.css gives every bare <input> a border, radius and padding from an
// unlayered rule, which outranks plain utilities — hence the `!` on those two.
const RANGE_BASE =
  "appearance-none cursor-pointer p-0 border-0! rounded-full! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white";

function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick} className={ICON_BUTTON}>
      {children}
    </button>
  );
}

export interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedFraction: number;
  volume: number;
  muted: boolean;
  rate: number;
  rates: number[];
  qualityLabel: string | null;
  captionsAvailable: boolean;
  captionsOn: boolean;
  canFullscreen: boolean;
  isFullscreen: boolean;
  /** Fullscreen shows only the player element, so the menu must portal into it. */
  menuContainer: HTMLElement | null;
  onTogglePlay: () => void;
  onSkip: (deltaSeconds: number) => void;
  /** `commit` is false while the thumb is being dragged, true once it is released. */
  onScrub: (seconds: number, commit: boolean) => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onRateChange: (rate: number) => void;
  onToggleCaptions: () => void;
  onToggleFullscreen: () => void;
  onMenuOpenChange: (open: boolean) => void;
}

export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  bufferedFraction,
  volume,
  muted,
  rate,
  rates,
  qualityLabel,
  captionsAvailable,
  captionsOn,
  canFullscreen,
  isFullscreen,
  menuContainer,
  onTogglePlay,
  onSkip,
  onScrub,
  onToggleMute,
  onVolumeChange,
  onRateChange,
  onToggleCaptions,
  onToggleFullscreen,
  onMenuOpenChange,
}: VideoControlsProps) {
  const hasDuration = duration > 0;
  const playedPercent = hasDuration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = Math.max(playedPercent, Math.min(100, bufferedFraction * 100));
  const shownVolume = muted ? 0 : volume;

  const timelineTrack: CSSProperties = {
    background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${playedPercent}%, rgb(255 255 255 / 0.45) ${playedPercent}%, rgb(255 255 255 / 0.45) ${bufferedPercent}%, rgb(255 255 255 / 0.2) ${bufferedPercent}%, rgb(255 255 255 / 0.2) 100%)`,
  };
  const volumeTrack: CSSProperties = {
    background: `linear-gradient(to right, #fff 0%, #fff ${shownVolume}%, rgb(255 255 255 / 0.3) ${shownVolume}%, rgb(255 255 255 / 0.3) 100%)`,
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="flex flex-col gap-1 px-2 pb-1.5 pt-8 sm:px-4 sm:pb-2.5">
      {/* Timeline */}
      <div className="flex items-center gap-2 px-1.5 sm:gap-3">
        <span className="shrink-0 text-xs font-semibold tabular-nums text-white sm:text-[13px]" aria-hidden="true">
          {formatVideoTime(currentTime)}
        </span>
        {/* py-3 keeps the 6px track a comfortable touch target. */}
        <input
          type="range"
          min={0}
          max={hasDuration ? Math.floor(duration) : 0}
          step={1}
          value={Math.min(Math.floor(currentTime), hasDuration ? Math.floor(duration) : 0)}
          disabled={!hasDuration}
          onChange={(event) => onScrub(Number(event.currentTarget.value), false)}
          onPointerUp={(event) => onScrub(Number(event.currentTarget.value), true)}
          onKeyUp={(event) => onScrub(Number(event.currentTarget.value), true)}
          onBlur={(event) => onScrub(Number(event.currentTarget.value), true)}
          aria-label="Seek"
          aria-valuetext={`${formatVideoTime(currentTime)} of ${formatVideoTime(duration)}`}
          style={timelineTrack}
          className={`${RANGE_BASE} my-3 h-1.5 min-w-0 flex-1 touch-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4`}
        />
        <span className="shrink-0 text-xs font-semibold tabular-nums text-white/80 sm:text-[13px]" aria-hidden="true">
          {formatVideoTime(duration)}
        </span>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center">
          <IconButton label={isPlaying ? "Pause video" : "Play video"} onClick={onTogglePlay}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </IconButton>
          <IconButton label={`Skip backward ${SKIP_SECONDS} seconds`} onClick={() => onSkip(-SKIP_SECONDS)}>
            <span className="relative flex items-center justify-center">
              <RotateCcw size={22} />
              <span className="absolute text-[8px] font-bold leading-none" aria-hidden="true">
                {SKIP_SECONDS}
              </span>
            </span>
          </IconButton>
          <IconButton label={`Skip forward ${SKIP_SECONDS} seconds`} onClick={() => onSkip(SKIP_SECONDS)}>
            <span className="relative flex items-center justify-center">
              <RotateCw size={22} />
              <span className="absolute text-[8px] font-bold leading-none" aria-hidden="true">
                {SKIP_SECONDS}
              </span>
            </span>
          </IconButton>
          <IconButton label={muted ? "Unmute video" : "Mute video"} onClick={onToggleMute} pressed={muted}>
            <VolumeIcon size={20} />
          </IconButton>
          {/* Phones set loudness with their hardware keys (and iOS ignores a
              scripted volume), so the slider is for sm and up; mute stays. */}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={shownVolume}
            onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
            aria-label="Volume"
            aria-valuetext={`${shownVolume}%`}
            style={volumeTrack}
            className={`${RANGE_BASE} ml-1 hidden h-1 w-20 sm:block [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3`}
          />
        </div>

        <div className="flex items-center">
          {captionsAvailable && (
            <IconButton
              label={captionsOn ? "Turn captions off" : "Turn captions on"}
              onClick={onToggleCaptions}
              pressed={captionsOn}
            >
              {captionsOn ? <Captions size={20} style={{ color: ACCENT }} /> : <CaptionsOff size={20} />}
            </IconButton>
          )}

          <DropdownMenu onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Change playback speed and settings" title="Settings" className={ICON_BUTTON}>
                <Settings size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" container={menuContainer} className="min-w-[11rem]">
              <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={String(rate)} onValueChange={(value) => onRateChange(Number(value))}>
                {rates.map((option) => (
                  <DropdownMenuRadioItem key={option} value={String(option)} className="text-sm">
                    {option === 1 ? "Normal" : `${option}x`}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {/* YouTube picks the quality itself and no longer lets an
                  embedding page set it, so this row reports rather than offers. */}
              {qualityLabel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  <DropdownMenuItem disabled className="text-sm data-[disabled]:opacity-80">
                    Auto ({qualityLabel})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canFullscreen && (
            <IconButton label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
