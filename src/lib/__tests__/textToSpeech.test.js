import {
  asSentence,
  groupVoicesByLanguage,
  loadTtsPreferences,
  pickVoice,
  resolveSpeechLang,
  sanitizeRate,
  saveTtsPreferences,
  splitTextIntoChunks,
  textsToChunks,
  TTS_PREFERENCES_KEY,
} from "../textToSpeech.js";
import { buildAnswerReviewSpeech, buildQuestionSpeech, buildResultSummarySpeech } from "../quizSpeech.js";

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
}

const voices = [
  { name: "Samantha", lang: "en-US", voiceURI: "samantha", default: true, localService: true },
  { name: "Daniel", lang: "en-GB", voiceURI: "daniel", default: false, localService: true },
  { name: "Lekha", lang: "hi-IN", voiceURI: "lekha", default: false, localService: true },
  { name: "Google español", lang: "es-ES", voiceURI: "google-es", default: false, localService: false },
];

function runTests() {
  const lesson =
    "Variables store data in a program. Each variable has a name and a value. Variables can change during program execution.";
  const longSentence = `${"This clause keeps going, ".repeat(20)}and finally ends.`;

  const cases = [
    {
      name: "splits a paragraph into its three sentences",
      run: () => splitTextIntoChunks(lesson, "en-US").map((c) => c.text),
      expected: [
        "Variables store data in a program.",
        "Each variable has a name and a value.",
        "Variables can change during program execution.",
      ],
    },
    {
      name: "chunk ranges point back at the original text (no surrounding whitespace)",
      run: () => {
        const text = "  First sentence here.   Second one follows.  ";
        const chunks = splitTextIntoChunks(text);
        return (
          chunks.length > 0 &&
          chunks.every((c) => !/^\s|\s$/.test(text.slice(c.start, c.end)) && text.slice(c.start, c.end).replace(/\s+/g, " ") === c.text)
        );
      },
      expected: true,
    },
    {
      name: "over-long sentences are split under the chunk limit",
      run: () => splitTextIntoChunks(longSentence).every((c) => c.text.length <= 200),
      expected: true,
    },
    {
      name: "over-long sentences lose no words when split",
      run: () => splitTextIntoChunks(longSentence).map((c) => c.text).join(" ") === longSentence.replace(/\s+/g, " ").trim(),
      expected: true,
    },
    {
      name: "tiny fragments are merged instead of becoming their own utterance",
      run: () => splitTextIntoChunks("Yes. That is the complete answer to the question.").length,
      expected: 1,
    },
    {
      name: "Hindi danda ends a sentence",
      run: () => splitTextIntoChunks("यह पहला वाक्य है और यह काफी लंबा है। यह दूसरा वाक्य है और यह भी लंबा है।", "hi-IN").length,
      expected: 2,
    },
    { name: "whitespace-only text yields no chunks", run: () => splitTextIntoChunks("   \n "), expected: [] },
    { name: "textsToChunks skips empty pieces", run: () => textsToChunks(["", "  ", "Hello there, student."]), expected: ["Hello there, student."] },
    { name: "asSentence adds a stop to a heading", run: () => asSentence("  Operating  systems "), expected: "Operating systems." },
    { name: "asSentence keeps existing punctuation", run: () => asSentence("Ready?"), expected: "Ready?" },

    { name: "course language name maps to a locale", run: () => resolveSpeechLang("Hindi"), expected: "hi-IN" },
    { name: "language tag passes through", run: () => resolveSpeechLang("es_MX"), expected: "es-MX" },
    { name: "unknown language gives no tag", run: () => resolveSpeechLang("Klingon Deluxe"), expected: "" },
    { name: "missing language gives no tag", run: () => resolveSpeechLang(undefined), expected: "" },

    { name: "saved voice wins when it still exists", run: () => pickVoice(voices, { lang: "en-US", preferredVoiceURI: "daniel" })?.voiceURI, expected: "daniel" },
    { name: "missing saved voice falls back to a language match", run: () => pickVoice(voices, { lang: "hi-IN", preferredVoiceURI: "gone" })?.voiceURI, expected: "lekha" },
    { name: "same primary language matches a different region", run: () => pickVoice(voices, { lang: "es-MX" })?.voiceURI, expected: "google-es" },
    { name: "no voice for the language returns null (browser decides)", run: () => pickVoice(voices, { lang: "ja-JP" }), expected: null },
    { name: "no language uses the default voice", run: () => pickVoice(voices, {})?.voiceURI, expected: "samantha" },
    { name: "no voices at all returns null", run: () => pickVoice([], { lang: "en-US" }), expected: null },
    {
      name: "voice groups put the content language first",
      run: () => groupVoicesByLanguage(voices, { contentLang: "hi-IN", displayLocale: "en" }).map((g) => g.key),
      expected: ["hi", "en", "es"],
    },
    {
      name: "voice groups are labelled by language name",
      run: () => groupVoicesByLanguage(voices, { displayLocale: "en" }).find((g) => g.key === "hi")?.label,
      expected: "Hindi",
    },

    { name: "unsupported rate falls back to 1x", run: () => sanitizeRate(3), expected: 1 },
    {
      name: "preferences round-trip through storage",
      run: () => {
        const store = memoryStorage();
        saveTtsPreferences({ rate: 1.5, voices: { en: "daniel" } }, store);
        return loadTtsPreferences(store);
      },
      expected: { rate: 1.5, voices: { en: "daniel" } },
    },
    {
      name: "corrupt stored preferences fall back to defaults",
      run: () => loadTtsPreferences(memoryStorage({ [TTS_PREFERENCES_KEY]: "{not json" })),
      expected: { rate: 1, voices: {} },
    },

    {
      name: "question speech reads question, lettered choices in display order, then instructions",
      run: () =>
        buildQuestionSpeech({
          question: { question: "What is the primary purpose of an operating system?" },
          type: "MCQ_SINGLE",
          options: ["Manage computer hardware and software", { optionText: "Create websites" }],
          questionNumber: 1,
          totalQuestions: 4,
        }),
      expected: [
        "Question 1 of 4.",
        "What is the primary purpose of an operating system?",
        "Answer choices.",
        "A. Manage computer hardware and software.",
        "B. Create websites.",
        "Choose one answer.",
      ],
    },
    {
      name: "question speech reads a hint when the question has one",
      run: () => buildQuestionSpeech({ question: { question: "Pick one?", hint: "Think about memory" }, type: "MCQ_SINGLE", options: [] }).at(-1),
      expected: "Hint: Think about memory.",
    },
    {
      name: "result summary speech",
      run: () => buildResultSummarySpeech({ quizTitle: "OS Basics", passed: true, correctCount: 3, totalQuestions: 4, percentage: 75 }),
      expected: ["OS Basics submitted.", "You passed.", "You answered 3 of 4 questions correctly.", "Your score is 75 percent."],
    },
    {
      name: "answer review speech gives the correct answer and explanation when wrong",
      run: () =>
        buildAnswerReviewSpeech({
          question: { question: "2 + 2?", options: ["3", "4"], correctAnswer: "4", explanation: "Two pairs make four." },
          index: 0,
          type: "MCQ_SINGLE",
          selectedOption: "3",
        }),
      expected: ["Question 1. 2 + 2?", "Your answer: 3.", "That is incorrect.", "Correct answer: 4.", "Explanation: Two pairs make four."],
    },
    {
      name: "answer review speech says when a question wasn't answered",
      run: () => buildAnswerReviewSpeech({ question: { question: "Pick?", options: ["a"], correctAnswer: "a" }, index: 1, type: "MCQ_SINGLE" })[1],
      expected: "You did not answer this question.",
    },
  ];

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING TEXT-TO-SPEECH TESTS ===");
  for (const testCase of cases) {
    let actual;
    try {
      actual = testCase.run();
    } catch (error) {
      actual = `THREW: ${error.message}`;
    }
    if (deepEqual(actual, testCase.expected)) {
      console.log(`[PASS] ${testCase.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testCase.name}`);
      console.error(`  expected: ${JSON.stringify(testCase.expected)}`);
      console.error(`  actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
