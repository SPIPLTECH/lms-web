"use client";

import { useId, useMemo } from "react";

import { SPEED_OPTIONS, groupVoicesByLanguage } from "@/lib/textToSpeech";

const formatSpeed = (rate) => `${rate}×`;

/**
 * Playback speed + voice pickers, shared by the lesson reader and the quiz
 * Listen buttons. Native <select>s on purpose: they're keyboard- and
 * screen-reader-accessible out of the box and open the platform picker on
 * mobile. `speech` is the object returned by useTextToSpeech().
 */
export default function SpeechSettings({ speech, lang = "", className = "" }) {
  const speedId = useId();
  const voiceId = useId();

  const groups = useMemo(
    () =>
      groupVoicesByLanguage(speech.voices, {
        contentLang: lang,
        displayLocale: typeof navigator !== "undefined" ? navigator.language : undefined,
      }),
    [speech.voices, lang]
  );

  const selectedVoice = speech.preferredVoiceURI(lang);

  const selectClass =
    // py-0 + leading-tight override the app-wide input/select padding
    // (globals.css), which otherwise clips the text inside this fixed height.
    "h-10 sm:h-9 min-w-0 rounded-lg border border-border bg-card px-2 py-0 text-sm leading-tight text-foreground cursor-pointer";

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label htmlFor={speedId} className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Speed
        </label>
        <select
          id={speedId}
          value={speech.rate}
          onChange={(event) => speech.setRate(Number(event.target.value))}
          aria-label="Playback speed"
          className={`${selectClass} w-[5.5rem]`}
        >
          {SPEED_OPTIONS.map((rate) => (
            <option key={rate} value={rate}>
              {formatSpeed(rate)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 basis-56">
        <label htmlFor={voiceId} className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Voice
        </label>
        <select
          id={voiceId}
          value={selectedVoice}
          onChange={(event) => speech.setVoice(event.target.value, lang)}
          aria-label="Select voice"
          disabled={!speech.voicesLoaded}
          className={`${selectClass} w-full max-w-xs disabled:cursor-wait disabled:opacity-60`}
        >
          <option value="">
            {speech.voicesLoaded ? "Automatic (matches content)" : "Loading voices…"}
          </option>
          {groups.map((group) => (
            <optgroup key={group.key} label={group.label}>
              {group.voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                  {voice.lang ? ` (${voice.lang})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}
