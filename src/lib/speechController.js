/**
 * The one owner of `window.speechSynthesis` for the whole app.
 *
 * Every Listen control (lesson reader, quiz question, result review) goes
 * through this singleton rather than calling speechSynthesis itself, which is
 * what guarantees there is never more than one reading session — starting a
 * new one always cancels the previous one first. Components subscribe through
 * hooks/useTextToSpeech.js (useSyncExternalStore).
 *
 * A session is a flat list of text chunks (sentences) spoken one utterance at
 * a time, so the UI can highlight, pause, resume, skip and show progress.
 */

import {
  DEFAULT_RATE,
  isSpeechSupported,
  loadTtsPreferences,
  pickVoice,
  sanitizeRate,
  saveTtsPreferences,
  voicePreferenceKey,
} from "@/lib/textToSpeech";

export const SPEECH_STATUS = {
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  COMPLETED: "completed",
};

export const SPEECH_UNAVAILABLE_MESSAGE = "Speech playback is unavailable.";

// Errors the engine reports for utterances WE cancelled — expected, not failures.
const BENIGN_ERRORS = new Set(["interrupted", "canceled"]);

// How long resume() gets to actually restart audio before we fall back to
// re-speaking the current sentence (Android Chrome and some desktop voices
// treat pause() as cancel()).
const RESUME_WATCHDOG_MS = 400;

const SERVER_STATE = Object.freeze({
  supported: false,
  status: SPEECH_STATUS.IDLE,
  sessionId: null,
  index: 0,
  total: 0,
  lang: "",
  rate: DEFAULT_RATE,
  voiceURI: "",
  voices: [],
  voicesLoaded: false,
  error: "",
  // The session that hit `error`, so only its own Listen control shows it.
  errorSessionId: null,
});

let state = SERVER_STATE;
let chunks = [];
let preferences = null;
let initialized = false;
const listeners = new Set();

// Identifies the utterance currently allowed to drive state. Every speak (and
// every stop) bumps it, so late events from a cancelled utterance are ignored.
let utteranceToken = 0;
let pendingSpeakTimer = null;
let resumeWatchdog = null;
let voicePollTimer = null;
let errorTimer = null;

function synth() {
  return isSpeechSupported() ? window.speechSynthesis : null;
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function clearTimers() {
  clearTimeout(pendingSpeakTimer);
  clearTimeout(resumeWatchdog);
  pendingSpeakTimer = null;
  resumeWatchdog = null;
}

function readVoices() {
  const engine = synth();
  if (!engine) return;
  let voices = [];
  try {
    voices = engine.getVoices() || [];
  } catch {
    voices = [];
  }
  if (voices.length > 0) {
    clearInterval(voicePollTimer);
    voicePollTimer = null;
    setState({ voices, voicesLoaded: true, voiceURI: resolvedVoiceURI(state.lang, voices) });
  }
}

function resolvedVoiceURI(lang, voices = state.voices) {
  const preferred = preferences?.voices?.[voicePreferenceKey(lang)] || "";
  return pickVoice(voices, { lang, preferredVoiceURI: preferred })?.voiceURI || "";
}

function init() {
  if (initialized || !isSpeechSupported()) return;
  initialized = true;
  preferences = loadTtsPreferences();
  state = { ...state, supported: true, rate: preferences.rate };

  const engine = synth();
  // Chrome fills the list asynchronously and announces it; Safari/iOS may
  // never fire voiceschanged, so poll briefly as well and give up gracefully
  // (the browser's default voice still works with an empty list).
  engine.addEventListener?.("voiceschanged", readVoices);
  readVoices();
  if (!state.voicesLoaded) {
    let attempts = 0;
    voicePollTimer = setInterval(() => {
      attempts += 1;
      readVoices();
      if (attempts >= 20 && !state.voicesLoaded) {
        clearInterval(voicePollTimer);
        voicePollTimer = null;
        setState({ voicesLoaded: true });
      }
    }, 250);
  }

  // Leaving the page (full navigation, tab close, bfcache) must not leave the
  // engine talking over whatever comes next.
  window.addEventListener("pagehide", () => stop());
}

function hardCancel() {
  const engine = synth();
  if (!engine) return;
  utteranceToken += 1;
  clearTimers();
  try {
    // Safari keeps a paused engine paused for the NEXT utterance unless it's
    // resumed before cancelling.
    if (engine.paused) engine.resume();
    engine.cancel();
  } catch {
    // Nothing useful to do — state is reset by the caller either way.
  }
}

function fail() {
  const failedSession = state.sessionId;
  hardCancel();
  setState({
    status: SPEECH_STATUS.IDLE,
    sessionId: null,
    index: 0,
    total: 0,
    error: SPEECH_UNAVAILABLE_MESSAGE,
    errorSessionId: failedSession,
  });
  chunks = [];
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => setState({ error: "", errorSessionId: null }), 5000);
}

function speakIndex(index) {
  const engine = synth();
  if (!engine || index < 0 || index >= chunks.length) return;

  const wasBusy = engine.speaking || engine.pending || engine.paused;
  hardCancel();
  const token = utteranceToken;

  setState({ index, status: SPEECH_STATUS.PLAYING, error: "" });

  const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
  utterance.rate = state.rate;
  if (state.lang) utterance.lang = state.lang;
  const voice = state.voices.find((v) => v.voiceURI === state.voiceURI);
  if (voice) {
    utterance.voice = voice;
    // A voice's own lang wins over the content tag, or some engines refuse it.
    utterance.lang = voice.lang || utterance.lang;
  }

  utterance.onstart = () => {
    if (token !== utteranceToken) return;
    if (state.status !== SPEECH_STATUS.PAUSED) setState({ status: SPEECH_STATUS.PLAYING });
  };
  utterance.onpause = () => {
    if (token !== utteranceToken) return;
    setState({ status: SPEECH_STATUS.PAUSED });
  };
  utterance.onresume = () => {
    if (token !== utteranceToken) return;
    clearTimeout(resumeWatchdog);
    setState({ status: SPEECH_STATUS.PLAYING });
  };
  utterance.onend = () => {
    if (token !== utteranceToken) return;
    // Some engines fire `end` for a paused utterance they dropped; the student
    // asked to pause, so wait for Resume rather than racing ahead.
    if (state.status === SPEECH_STATUS.PAUSED) return;
    const nextIndex = state.index + 1;
    if (nextIndex < chunks.length) {
      speakIndex(nextIndex);
    } else {
      utteranceToken += 1;
      setState({ status: SPEECH_STATUS.COMPLETED, index: chunks.length - 1 });
    }
  };
  utterance.onerror = (event) => {
    if (token !== utteranceToken) return;
    if (BENIGN_ERRORS.has(event?.error)) return;
    fail();
  };

  const speakNow = () => {
    if (token !== utteranceToken) return;
    try {
      engine.speak(utterance);
    } catch {
      fail();
    }
  };

  // Speaking synchronously keeps the call inside the student's click, which
  // iOS requires. Only when an earlier utterance was just cancelled is there a
  // short delay: Chrome can drop a speak() issued in the same tick as cancel().
  if (wasBusy) pendingSpeakTimer = setTimeout(speakNow, 60);
  else speakNow();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function subscribe(listener) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  init();
  return state;
}

export function getServerSnapshot() {
  return SERVER_STATE;
}

/**
 * Starts a reading session, replacing any session already speaking.
 * @param {string} sessionId  Stable id of the thing being read (e.g. "lesson:<id>").
 * @param {string[]} textChunks  Sentences/chunks in reading order.
 * @param {{ lang?: string, startIndex?: number }} options
 */
export function start(sessionId, textChunks, { lang = "", startIndex = 0 } = {}) {
  init();
  if (!isSpeechSupported()) return;
  const list = (textChunks || []).filter((t) => typeof t === "string" && t.trim());
  if (list.length === 0) return;

  chunks = list;
  const index = Math.min(Math.max(0, startIndex), list.length - 1);
  setState({ sessionId, total: list.length, lang, voiceURI: resolvedVoiceURI(lang), error: "" });
  speakIndex(index);
}

export function pause() {
  const engine = synth();
  if (!engine || state.status !== SPEECH_STATUS.PLAYING) return;
  clearTimeout(pendingSpeakTimer);
  try {
    engine.pause();
  } catch {
    // Fall through — the paused state below still lets Resume restart the sentence.
  }
  setState({ status: SPEECH_STATUS.PAUSED });
}

export function resume() {
  const engine = synth();
  if (!engine || state.status !== SPEECH_STATUS.PAUSED) return;
  const token = utteranceToken;

  if (engine.paused && engine.speaking) {
    setState({ status: SPEECH_STATUS.PLAYING });
    try {
      engine.resume();
    } catch {
      speakIndex(state.index);
      return;
    }
    // If audio didn't actually come back, restart the current sentence.
    clearTimeout(resumeWatchdog);
    resumeWatchdog = setTimeout(() => {
      if (token !== utteranceToken || state.status !== SPEECH_STATUS.PLAYING) return;
      if (engine.paused || !engine.speaking) speakIndex(state.index);
    }, RESUME_WATCHDOG_MS);
    return;
  }

  // The engine dropped the paused utterance (or never paused it) — replay
  // the sentence the student paused on.
  speakIndex(state.index);
}

export function stop() {
  if (!initialized) return;
  hardCancel();
  chunks = [];
  if (state.status !== SPEECH_STATUS.IDLE || state.sessionId) {
    setState({ status: SPEECH_STATUS.IDLE, sessionId: null, index: 0, total: 0 });
  }
}

/** Stops only if `sessionId` is the session currently loaded. */
export function stopSession(sessionId) {
  if (sessionId && state.sessionId === sessionId) stop();
}

export function next() {
  if (!state.sessionId || state.index >= chunks.length - 1) return;
  speakIndex(state.index + 1);
}

export function previous() {
  if (!state.sessionId || chunks.length === 0) return;
  speakIndex(Math.max(0, state.index - 1));
}

// Applies a new rate/voice to a session in progress by restarting the current
// sentence (an utterance's settings can't change once it's speaking).
function restartIfPlaying() {
  if (state.status === SPEECH_STATUS.PLAYING && chunks.length) speakIndex(state.index);
}

export function setRate(rate) {
  init();
  const value = sanitizeRate(rate);
  if (preferences) {
    preferences = { ...preferences, rate: value };
    saveTtsPreferences(preferences);
  }
  setState({ rate: value });
  restartIfPlaying();
}

export function setVoice(voiceURI, lang = state.lang) {
  init();
  const key = voicePreferenceKey(lang);
  if (preferences) {
    const voices = { ...preferences.voices };
    if (voiceURI) voices[key] = voiceURI;
    else delete voices[key];
    preferences = { ...preferences, voices };
    saveTtsPreferences(preferences);
  }
  setState({ voiceURI: voiceURI ? voiceURI : resolvedVoiceURI(lang) });
  restartIfPlaying();
}

/**
 * The voice the student explicitly chose for `lang`, if it still exists on
 * this device — "" means "automatic" (the best match for the content).
 */
export function preferredVoiceURI(lang) {
  init();
  const saved = preferences?.voices?.[voicePreferenceKey(lang)] || "";
  return saved && state.voices.some((v) => v.voiceURI === saved) ? saved : "";
}
