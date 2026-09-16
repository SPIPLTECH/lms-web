/**
 * Pure helpers behind the student Text-to-Speech feature — no React and no
 * speechSynthesis calls here (those live in lib/speechController.js), so the
 * text/voice rules can be unit-tested with plain `node`.
 *
 * Everything is browser-native: the Web Speech API reads the text on the
 * student's own device. Nothing is sent to a server and no audio is stored.
 */

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];
export const DEFAULT_RATE = 1;

// Long enough for a natural sentence, short enough that one utterance stays
// well under the ~15s after which some Chrome voices silently stop speaking.
export const MAX_CHUNK_LENGTH = 200;
// Fragments shorter than this ("Yes.", "1.") are folded into a neighbour so
// a lesson doesn't become hundreds of tiny utterances.
const MIN_CHUNK_LENGTH = 24;

/** True when this browser can actually speak. Safe to call during SSR. */
export function isSpeechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

// Course.language is free text ("English" by default) — the common names map
// to a BCP-47 tag. Anything already shaped like a tag ("hi", "es-MX") passes
// through as-is.
const LANGUAGE_NAME_TO_TAG = {
  english: "en-US",
  hindi: "hi-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  bangla: "bn-IN",
  gujarati: "gu-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  kannada: "kn-IN",
  malayalam: "ml-IN",
  punjabi: "pa-IN",
  odia: "or-IN",
  urdu: "ur-IN",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  italian: "it-IT",
  portuguese: "pt-BR",
  russian: "ru-RU",
  japanese: "ja-JP",
  korean: "ko-KR",
  chinese: "zh-CN",
  mandarin: "zh-CN",
  arabic: "ar-SA",
  turkish: "tr-TR",
  dutch: "nl-NL",
  polish: "pl-PL",
  indonesian: "id-ID",
  vietnamese: "vi-VN",
  thai: "th-TH",
};

/**
 * Resolves content/course language metadata to a BCP-47 tag, or "" when the
 * language is unknown (the browser's default voice is used then).
 */
export function resolveSpeechLang(language) {
  if (!language || typeof language !== "string") return "";
  const trimmed = language.trim();
  if (!trimmed) return "";
  const byName = LANGUAGE_NAME_TO_TAG[trimmed.toLowerCase()];
  if (byName) return byName;
  if (/^[a-z]{2,3}([-_][a-z0-9]{2,8})*$/i.test(trimmed)) return trimmed.replace(/_/g, "-");
  return "";
}

/** "hi-IN" -> "hi". */
export function primaryLanguage(lang) {
  return (lang || "").split(/[-_]/)[0].toLowerCase();
}

const collapseWhitespace = (text) => text.replace(/\s+/g, " ").trim();

function sentenceRanges(text, lang) {
  const ranges = [];
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter(lang || undefined, { granularity: "sentence" });
      for (const { index, segment } of segmenter.segment(text)) {
        ranges.push({ start: index, end: index + segment.length });
      }
      return ranges;
    } catch {
      // An unsupported locale tag — fall through to the regex splitter.
    }
  }
  // Sentence end: . ! ? … or the Devanagari danda, plus closing quotes, then
  // whitespace. Keeps "3.14" and "e.g.x" together.
  const boundary = /[.!?…।॥]+["'”’)\]]*\s+/g;
  let start = 0;
  let match;
  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[0].length;
    ranges.push({ start, end });
    start = end;
  }
  if (start < text.length) ranges.push({ start, end: text.length });
  return ranges;
}

// Splits one over-long sentence at the last clause break (, ; :) or space
// that keeps each piece under the limit.
function splitLongRange(text, { start, end }, maxLength) {
  const pieces = [];
  let cursor = start;
  while (end - cursor > maxLength) {
    const window = text.slice(cursor, cursor + maxLength);
    let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    if (cut < maxLength * 0.4) cut = window.lastIndexOf(" ");
    if (cut <= 0) cut = maxLength - 1;
    pieces.push({ start: cursor, end: cursor + cut + 1 });
    cursor += cut + 1;
  }
  pieces.push({ start: cursor, end });
  return pieces;
}

/**
 * Splits text into speakable chunks, returned as character ranges into the
 * ORIGINAL string (so a caller can map a chunk back onto the DOM text it came
 * from). Sentences first; over-long sentences are split at clause breaks;
 * tiny fragments are merged into a neighbour. Whitespace-only ranges are
 * dropped.
 *
 * @returns {{ start: number, end: number, text: string }[]}
 */
export function splitTextIntoChunks(text, lang = "", maxLength = MAX_CHUNK_LENGTH) {
  if (!text || !text.trim()) return [];

  const ranges = sentenceRanges(text, lang).flatMap((range) => splitLongRange(text, range, maxLength));

  const merged = [];
  for (const range of ranges) {
    if (!text.slice(range.start, range.end).trim()) {
      // Whitespace between sentences belongs to the previous chunk's range.
      if (merged.length) merged[merged.length - 1].end = range.end;
      continue;
    }
    const last = merged[merged.length - 1];
    const lastLength = last ? collapseWhitespace(text.slice(last.start, last.end)).length : 0;
    const rangeLength = collapseWhitespace(text.slice(range.start, range.end)).length;
    if (last && (lastLength < MIN_CHUNK_LENGTH || rangeLength < MIN_CHUNK_LENGTH) && lastLength + rangeLength <= maxLength) {
      last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }

  return merged
    .map((range) => {
      // Trim the range itself (not just the text) so a highlight never
      // paints the whitespace around a sentence.
      let { start, end } = range;
      while (start < end && /\s/.test(text[start])) start++;
      while (end > start && /\s/.test(text[end - 1])) end--;
      return { start, end, text: collapseWhitespace(text.slice(start, end)) };
    })
    .filter((chunk) => chunk.text);
}

/**
 * Splits several independent pieces of text (a question, then each answer
 * choice, ...) into one flat list of chunk strings, keeping every piece's
 * sentences apart from its neighbours'.
 */
export function textsToChunks(texts, lang = "") {
  return (texts || [])
    .filter((t) => typeof t === "string" && t.trim())
    .flatMap((t) => splitTextIntoChunks(t, lang).map((chunk) => chunk.text));
}

/** Adds a full stop to a heading-like line so the voice pauses after it. */
export function asSentence(text) {
  const clean = collapseWhitespace(String(text ?? ""));
  if (!clean) return "";
  return /[.!?…:;।॥]$/.test(clean) ? clean : `${clean}.`;
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

/**
 * Picks the voice to speak with. Order: the student's saved voice for this
 * language (if it still exists), then the browser's default voice when it
 * matches the language, then an exact-locale voice, then any voice of the
 * same primary language. Returns null when nothing fits — the utterance then
 * carries only `lang` and the browser chooses.
 */
export function pickVoice(voices, { lang = "", preferredVoiceURI = "" } = {}) {
  const list = Array.isArray(voices) ? voices : [];
  if (list.length === 0) return null;

  if (preferredVoiceURI) {
    const saved = list.find((v) => v.voiceURI === preferredVoiceURI);
    if (saved) return saved;
  }

  if (!lang) return list.find((v) => v.default) || null;

  const wanted = lang.toLowerCase().replace(/_/g, "-");
  const wantedPrimary = primaryLanguage(wanted);
  const normalized = (v) => (v.lang || "").toLowerCase().replace(/_/g, "-");
  const samePrimary = list.filter((v) => primaryLanguage(normalized(v)) === wantedPrimary);
  if (samePrimary.length === 0) return null;

  return (
    samePrimary.find((v) => v.default) ||
    samePrimary.find((v) => normalized(v) === wanted && v.localService) ||
    samePrimary.find((v) => normalized(v) === wanted) ||
    samePrimary.find((v) => v.localService) ||
    samePrimary[0]
  );
}

/**
 * Groups voices by primary language for the voice picker, labelled with the
 * language's display name. The content's own language group comes first.
 *
 * @returns {{ key: string, label: string, voices: SpeechSynthesisVoice[] }[]}
 */
export function groupVoicesByLanguage(voices, { contentLang = "", displayLocale } = {}) {
  let displayNames = null;
  try {
    displayNames = new Intl.DisplayNames(displayLocale ? [displayLocale] : undefined, { type: "language" });
  } catch {
    displayNames = null;
  }

  const groups = new Map();
  for (const voice of voices || []) {
    const key = primaryLanguage(voice.lang) || "other";
    if (!groups.has(key)) {
      let label = key === "other" ? "Other" : key;
      try {
        label = (key !== "other" && displayNames?.of(key)) || label;
      } catch {
        // Unknown code — keep the raw key.
      }
      groups.set(key, { key, label, voices: [] });
    }
    groups.get(key).voices.push(voice);
  }

  const contentKey = primaryLanguage(contentLang);
  return [...groups.values()]
    .map((group) => ({ ...group, voices: [...group.voices].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => {
      if (a.key === contentKey) return -1;
      if (b.key === contentKey) return 1;
      return a.label.localeCompare(b.label);
    });
}

// ---------------------------------------------------------------------------
// Preferences (speed + voice) — localStorage only, never any lesson content.
// ---------------------------------------------------------------------------

export const TTS_PREFERENCES_KEY = "lms.tts.preferences";

export function sanitizeRate(rate) {
  const n = Number(rate);
  return SPEED_OPTIONS.includes(n) ? n : DEFAULT_RATE;
}

/** Voices are remembered per primary language ("en", "hi", or "default"). */
export function voicePreferenceKey(lang) {
  return primaryLanguage(lang) || "default";
}

export function loadTtsPreferences(storage) {
  const fallback = { rate: DEFAULT_RATE, voices: {} };
  try {
    const store = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
    const raw = store?.getItem(TTS_PREFERENCES_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const voices = {};
    if (parsed?.voices && typeof parsed.voices === "object") {
      for (const [key, uri] of Object.entries(parsed.voices)) {
        if (typeof uri === "string" && uri) voices[key] = uri;
      }
    }
    return { rate: sanitizeRate(parsed?.rate), voices };
  } catch {
    return fallback;
  }
}

export function saveTtsPreferences(preferences, storage) {
  try {
    const store = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
    store?.setItem(
      TTS_PREFERENCES_KEY,
      JSON.stringify({ rate: sanitizeRate(preferences?.rate), voices: preferences?.voices || {} })
    );
  } catch {
    // Private mode / storage disabled — preferences just won't persist.
  }
}
