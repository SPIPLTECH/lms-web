"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { usePreviewQuestionImport } from "@/hooks/queries/instructor/usePreviewQuestionImport";
import { RETIRED_QUESTION_TYPES } from "@/lib/questionType";

const ACCEPTED = ".csv,.xlsx,.xls,.docx,.pdf,.txt,.json";

// `explanation` says why the correct answer is right; each optionX_explanation
// says why that option is wrong, and is left empty for a correct option.
const SAMPLE_CSV = `question,optionA,optionB,optionC,optionD,correctAnswer,marks,difficulty,explanation,optionA_explanation,optionB_explanation,optionC_explanation,optionD_explanation
"Which planet is known as the Red Planet?",Venus,Mars,Jupiter,Saturn,B,1,EASY,"Iron oxide (rust) in its soil makes it look red.","Venus looks yellow-white because of its thick clouds.",,"Jupiter shows bands of cream, brown and orange.","Saturn looks pale gold."
"Which of these are prime numbers?",2,4,5,9,"A;C",2,MEDIUM,"2 and 5 can only be divided by 1 and themselves. Separate several correct answers with a semicolon.",,"4 = 2 × 2, so it has a divisor other than 1 and itself.",,"9 = 3 × 3, so it is not prime."
"The Sun is a star.",True,False,,,True,1,EASY,"The Sun makes its own light by nuclear fusion, which is what a star is.",,"Planets and moons only reflect light. The Sun makes its own, so it is a star.",,
`;

// The same per-option reasons in JSON: an option is an object whose
// `explanation` says why it is wrong.
const SAMPLE_JSON = `${JSON.stringify(
  [
    {
      question: "Which keyword starts a function definition in Python?",
      type: "MCQ_SINGLE",
      options: [
        { optionText: "function", explanation: "function is the JavaScript keyword. In Python, writing function greet(): is a syntax error." },
        { optionText: "def" },
        { optionText: "func", explanation: "func is used in languages such as Go and Swift. Python does not recognise it." },
        { optionText: "define", explanation: "define is plain English, not a Python keyword. Python only accepts def." },
      ],
      correctAnswer: "def",
      marks: 1,
      difficulty: "EASY",
      explanation: "Python uses def, then the function name and parentheses, for example def greet():.",
    },
    {
      question: "Which of these are prime numbers?",
      type: "MCQ_MULTI",
      options: [
        { optionText: "2" },
        { optionText: "4", explanation: "4 = 2 × 2, so it has a divisor other than 1 and itself." },
        { optionText: "5" },
        { optionText: "9", explanation: "9 = 3 × 3, so it is not prime." },
      ],
      correctAnswer: ["2", "5"],
      marks: 2,
      difficulty: "MEDIUM",
      explanation: "2 and 5 can only be divided by 1 and themselves.",
    },
  ],
  null,
  2
)}\n`;

const TYPE_LABEL = {
  ...RETIRED_QUESTION_TYPES,
  MCQ_SINGLE: "Single choice",
  MCQ_MULTI: "Multiple choice",
  ARRANGE_TOKENS: "Arrange Tokens",
  MATCH_PAIRS: "Match Pairs",
};

// A row whose only problems are about its answer can still be added: it comes
// in with no answer chosen, and the editor won't save the quiz until one is.
const ANSWER_PROBLEM = /correct answer|single-choice question can have only one/i;
const answerOnly = (problems) => problems.length > 0 && problems.every((p) => ANSWER_PROBLEM.test(p));

const textKey = (text) => String(text || "").trim().replace(/\s+/g, " ").toLowerCase();

function downloadSample(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import questions into the quiz being edited in the composer. The file is
 * read on the server and shown here for review; the chosen rows are handed
 * to the editor through onAdd and saved with the quiz like any typed question.
 *
 * @param {{ open: boolean, onClose: () => void, existingQuestions: {question: string}[],
 *           onAdd: (rows: object[], mode: "append" | "replace") => void }} props
 */
export default function QuizImportModal({ open, onClose, existingQuestions = [], onAdd }) {
  const preview = usePreviewQuestionImport();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("append");
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState("");

  const existingKeys = useMemo(() => new Set(existingQuestions.map((q) => textKey(q.question))), [existingQuestions]);
  const canReplace = existingQuestions.length > 0;

  const reset = () => {
    setFile(null);
    setMode("append");
    setRows(null);
    setSelected(new Set());
    setError("");
    preview.reset();
  };

  const close = () => {
    if (preview.isPending) return;
    reset();
    onClose();
  };

  const chooseFile = (next) => {
    if (!next) return;
    setFile(next);
    setError("");
  };

  const checkFile = async () => {
    if (!file) return;
    setError("");
    try {
      const data = await preview.mutateAsync(file);
      const annotated = (data?.questions || []).map((row) => {
        const duplicate = mode === "append" && existingKeys.has(textKey(row.question));
        const selectable = row.problems.length === 0 || answerOnly(row.problems);
        return { ...row, duplicate, selectable };
      });
      setRows(annotated);
      setSelected(new Set(annotated.filter((r) => r.selectable && r.problems.length === 0 && !r.duplicate).map((r) => r.row)));
    } catch (err) {
      setError(err?.response?.data?.message || (err?.request ? "Could not reach the server. Check your connection and try again." : "This file could not be checked."));
    }
  };

  const toggle = (rowNumber) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });

  const add = () => {
    const chosen = rows
      .filter((r) => selected.has(r.row))
      .map((r) => (r.problems.length ? { ...r, correctAnswer: r.questionType === "MCQ_MULTI" ? [] : "" } : r));
    onAdd(chosen, mode);
    reset();
    onClose();
  };

  const counts = rows
    ? {
        ready: rows.filter((r) => r.problems.length === 0 && !r.duplicate).length,
        fix: rows.filter((r) => r.problems.length > 0).length,
        duplicate: rows.filter((r) => r.duplicate).length,
      }
    : null;

  return (
    <Modal open={open} onClose={close} title="Import Questions" size="lg">
      {!rows ? (
        <div className="space-y-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              chooseFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <FileUp size={28} className="text-primary" aria-hidden="true" />
            {file ? (
              <>
                <p className="font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB. Click to choose another file.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">Drop a question file here, or click to choose one</p>
                <p className="text-xs text-muted-foreground">CSV, Excel, Word, PDF, TXT or JSON, up to 5 MB and 200 questions</p>
              </>
            )}
            <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">CSV or Excel:</span> one question per row, with columns question,
              optionA to optionD, correctAnswer, marks, difficulty and explanation. Write the answer as the option text or its
              letter; separate several correct answers with a semicolon. Use explanation for why the correct answer is right,
              and the optional optionA_explanation to optionD_explanation columns for why each wrong option is wrong.
            </p>
            <p>
              <span className="font-semibold text-foreground">JSON:</span> a list of questions. Write each option as an object
              with optionText, and add an explanation to a wrong option to say why it is wrong.
            </p>
            <p>
              <span className="font-semibold text-foreground">Word or PDF:</span> numbered questions (1.), lettered options (A))
              and an &quot;Answer:&quot; line. Scanned PDFs can&apos;t be read.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => downloadSample(SAMPLE_CSV, "quiz_questions_sample.csv", "text/csv")}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
              >
                <Download size={14} aria-hidden="true" /> Download sample CSV
              </button>
              <button
                type="button"
                onClick={() => downloadSample(SAMPLE_JSON, "quiz_questions_sample.json", "application/json")}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
              >
                <Download size={14} aria-hidden="true" /> Download sample JSON
              </button>
            </div>
          </div>

          {canReplace && (
            <fieldset className="space-y-2 text-sm">
              <legend className="mb-1 font-semibold text-foreground">This quiz already has {existingQuestions.length} question{existingQuestions.length === 1 ? "" : "s"}</legend>
              <label className="flex items-center gap-2 text-foreground cursor-pointer">
                <input type="radio" name="import-mode" checked={mode === "append"} onChange={() => setMode("append")} />
                Add the imported questions after them
              </label>
              <label className="flex items-center gap-2 text-foreground cursor-pointer">
                <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
                Replace them with the imported questions
              </label>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={close} disabled={preview.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={checkFile} disabled={!file || preview.isPending}>
              {preview.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Checking file…
                </span>
              ) : (
                "Check file"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{counts.ready} ready to add</span>
            {counts.fix > 0 && `, ${counts.fix} need fixing`}
            {counts.duplicate > 0 && `, ${counts.duplicate} already in this quiz`}. Untick any you don&apos;t want.
            {mode === "replace" && <span className="font-semibold text-destructive"> The quiz&apos;s current questions will be removed.</span>}
          </p>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => (
              <li key={r.row}>
                <label
                  className={`flex gap-3 rounded-xl border p-3 text-sm ${
                    r.selectable ? "cursor-pointer border-border hover:border-primary/40" : "cursor-not-allowed border-border opacity-70"
                  } ${selected.has(r.row) ? "bg-primary/5" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={!r.selectable}
                    checked={selected.has(r.row)}
                    onChange={() => toggle(r.row)}
                    aria-label={`Add question ${r.row}`}
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-semibold text-foreground">
                      {r.row}. {r.question || "(no question text)"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {TYPE_LABEL[r.questionType] || r.questionType}, {r.options.length} options, {r.marks} mark{r.marks === 1 ? "" : "s"}
                      {(() => {
                        const reasons = (r.optionExplanations || []).filter(Boolean).length;
                        return reasons > 0 ? `, ${reasons} wrong-option reason${reasons === 1 ? "" : "s"}` : "";
                      })()}
                      {r.problems.length === 0 && (
                        <>
                          {" "}
                          · Answer: <span className="text-foreground">{Array.isArray(r.correctAnswer) ? r.correctAnswer.join(", ") : r.correctAnswer}</span>
                        </>
                      )}
                    </span>
                    {r.problems.map((p) => (
                      <span key={p} className="flex items-start gap-1.5 text-xs font-medium text-destructive">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {p}
                      </span>
                    ))}
                    {answerOnly(r.problems) && (
                      <span className="block text-xs text-muted-foreground">You can add it and choose the answer in the editor.</span>
                    )}
                    {r.duplicate && <span className="block text-xs font-medium text-amber-500">A question with this text is already in the quiz.</span>}
                    {r.problems.length === 0 && !r.duplicate && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <CheckCircle2 size={13} aria-hidden="true" /> Ready
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" type="button" onClick={() => setRows(null)}>
              Choose another file
            </Button>
            <Button type="button" onClick={add} disabled={selected.size === 0}>
              {mode === "replace" ? "Replace with" : "Add"} {selected.size} question{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
