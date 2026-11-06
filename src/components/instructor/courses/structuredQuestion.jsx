"use client";

import { Plus, Trash2 } from "lucide-react";

/**
 * Arrange Tokens and Match Pairs in the composer's quiz editor. Their answer
 * lives in the structure itself, so they get these fields instead of a list of
 * options to tick. The stored shapes are the ones QuestionForm and the API's
 * import write:
 *
 *  - Arrange Tokens: `options` and `correctAnswer` both hold the tokens in
 *    their correct order.
 *  - Match Pairs: `options` is { left: [], right: [] } and `correctAnswer` is
 *    a left -> right map.
 */

const isColumns = (options) => Boolean(options) && Array.isArray(options.left) && Array.isArray(options.right);

const asKeyMap = (answer) => (answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {});

/**
 * Match Pairs' columns with each right item beside its left item. A saved
 * right column may be in any order, and the editor works by position, so this
 * runs whenever a question enters the editor.
 */
export function alignedMatchOptions(options, correctAnswer) {
  if (!isColumns(options)) return { left: [], right: [] };
  const key = asKeyMap(correctAnswer);
  return { left: options.left, right: options.left.map((left, i) => key[left] ?? options.right[i] ?? "") };
}

/** The question's fields for a set of `{ left, right }` rows. */
export function matchFieldsFromPairs(pairs) {
  return {
    options: { left: pairs.map((p) => p.left), right: pairs.map((p) => p.right) },
    correctAnswer: Object.fromEntries(pairs.filter((p) => p.left.trim() && p.right.trim()).map((p) => [p.left.trim(), p.right.trim()])),
  };
}

const pairsOf = (options) => {
  const { left, right } = isColumns(options) ? options : { left: [], right: [] };
  return left.map((item, i) => ({ left: item, right: right[i] ?? "" }));
};

/** What stops one of these questions being saved, or null. */
export function structuredQuestionProblem(question) {
  if (question.questionType === "ARRANGE_TOKENS") {
    const tokens = Array.isArray(question.options) ? question.options : [];
    if (tokens.length < 2) return "needs at least 2 tokens";
    return tokens.some((token) => !String(token).trim()) ? "has an empty token" : null;
  }
  if (question.questionType === "MATCH_PAIRS") {
    const pairs = pairsOf(question.options);
    if (pairs.length < 2) return "needs at least 2 pairs";
    if (pairs.some((p) => !p.left.trim() || !p.right.trim())) return "has an incomplete pair";
    return new Set(pairs.map((p) => p.left.trim())).size === pairs.length ? null : "has the same left-hand item twice";
  }
  return null;
}

const INPUT =
  "min-w-0 flex-1 rounded-lg border border-transparent bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500";
const REMOVE = "p-1 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 shrink-0 cursor-pointer";
const ADD = "text-[13px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer";

/** `onChange` takes the question's new `options` and `correctAnswer`. */
export function ArrangeTokensFields({ tokens, onChange }) {
  const list = Array.isArray(tokens) ? tokens : [];
  const set = (next) => onChange({ options: next, correctAnswer: next });

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">Tokens, in their correct order</label>
        <button type="button" onClick={() => set([...list, ""])} className={ADD}>
          <Plus size={12} /> Add Token
        </button>
      </div>
      <p className="text-[12px] text-muted-foreground">Students see these shuffled and rebuild this order.</p>
      <div className="space-y-2">
        {list.map((token, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[13px] font-mono font-bold text-muted-foreground">{i + 1}</span>
            <input
              type="text"
              value={token}
              onChange={(e) => set(list.map((t, j) => (j === i ? e.target.value : t)))}
              placeholder={`Token ${i + 1}`}
              aria-label={`Token ${i + 1}`}
              className={INPUT}
            />
            {list.length > 2 && (
              <button type="button" onClick={() => set(list.filter((_, j) => j !== i))} className={REMOVE} title="Remove Token">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** `onChange` takes the question's new `options` and `correctAnswer`. */
export function MatchPairsFields({ options, onChange }) {
  const pairs = pairsOf(options);
  const set = (next) => onChange(matchFieldsFromPairs(next));

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">Matching pairs</label>
        <button type="button" onClick={() => set([...pairs, { left: "", right: "" }])} className={ADD}>
          <Plus size={12} /> Add Pair
        </button>
      </div>
      <p className="text-[12px] text-muted-foreground">Students see the right-hand column shuffled.</p>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={pair.left}
              onChange={(e) => set(pairs.map((p, j) => (j === i ? { ...p, left: e.target.value } : p)))}
              placeholder={`Left ${i + 1}`}
              aria-label={`Left item ${i + 1}`}
              className={INPUT}
            />
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">
              &rarr;
            </span>
            <input
              type="text"
              value={pair.right}
              onChange={(e) => set(pairs.map((p, j) => (j === i ? { ...p, right: e.target.value } : p)))}
              placeholder={`Right ${i + 1}`}
              aria-label={`Right item ${i + 1}`}
              className={INPUT}
            />
            {pairs.length > 2 && (
              <button type="button" onClick={() => set(pairs.filter((_, j) => j !== i))} className={REMOVE} title="Remove Pair">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The answer of either type, for the quiz's read-only view. */
export function StructuredAnswer({ question }) {
  const isTokens = question.questionType === "ARRANGE_TOKENS";
  const rows = isTokens
    ? (Array.isArray(question.correctAnswer) ? question.correctAnswer : question.options || []).map((token) => [token])
    : pairsOf(question.options).map((p) => [p.left, p.right]);

  return (
    <div className="space-y-1.5 pt-2">
      <span className="text-[13px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
        {isTokens ? "Correct order:" : "Correct pairs:"}
      </span>
      <div className="grid grid-cols-1 gap-1.5">
        {rows.map((cells, i) => (
          <div
            key={i}
            className="p-2.5 rounded-lg text-sm font-medium border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/60 text-emerald-800 dark:text-emerald-300"
          >
            {isTokens ? `${i + 1}. ${cells[0]}` : `${cells[0]} → ${cells[1]}`}
          </div>
        ))}
      </div>
    </div>
  );
}
