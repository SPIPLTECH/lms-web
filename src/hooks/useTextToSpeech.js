"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import * as speech from "@/lib/speechController";

const { SPEECH_STATUS } = speech;

/**
 * React access to the app-wide speech controller (lib/speechController.js).
 *
 * Pass the `sessionId` of the thing this component reads aloud; the hook
 * reports whether THAT session is the one currently loaded, and stops it when
 * the component unmounts or the id changes (a different lesson block, quiz
 * question, ...) so speech never carries over onto the next screen.
 *
 * Returns `supported: false` during SSR and in browsers without the Web
 * Speech API — callers render nothing in that case.
 */
export default function useTextToSpeech(sessionId) {
  const state = useSyncExternalStore(speech.subscribe, speech.getSnapshot, speech.getServerSnapshot);

  useEffect(() => {
    if (!sessionId) return undefined;
    return () => speech.stopSession(sessionId);
  }, [sessionId]);

  const isActive = Boolean(sessionId) && state.sessionId === sessionId;
  const status = isActive ? state.status : SPEECH_STATUS.IDLE;

  const start = useCallback(
    (chunks, options) => speech.start(sessionId, chunks, options),
    [sessionId]
  );

  return useMemo(
    () => ({
      supported: state.supported,
      isActive,
      status,
      isPlaying: status === SPEECH_STATUS.PLAYING,
      isPaused: status === SPEECH_STATUS.PAUSED,
      isCompleted: status === SPEECH_STATUS.COMPLETED,
      // A session that's loaded and hasn't been stopped (including finished).
      isEngaged: status !== SPEECH_STATUS.IDLE,
      index: isActive ? state.index : 0,
      total: isActive ? state.total : 0,
      rate: state.rate,
      voices: state.voices,
      voicesLoaded: state.voicesLoaded,
      voiceURI: state.voiceURI,
      error: sessionId && state.errorSessionId === sessionId ? state.error : "",
      start,
      pause: speech.pause,
      resume: speech.resume,
      stop: speech.stop,
      next: speech.next,
      previous: speech.previous,
      setRate: speech.setRate,
      setVoice: speech.setVoice,
      preferredVoiceURI: speech.preferredVoiceURI,
    }),
    [state, sessionId, isActive, status, start]
  );
}

export { SPEECH_STATUS };
