/**
 * Measures what a student feels in real Chrome: time from the photo showing a violation being
 * sent to the warning on screen, capture timing, upload time, answer responsiveness, and how long
 * a termination takes to reach the screen. Run the same script before and after a change.
 *
 *   node scripts/proctoring-e2e/measure.mjs --label=before [--exams=3] [--out=file.json]
 */
import fs from "node:fs";

import { enterExam, launch, newStudentPage, seed, signIn, sleep, stats } from "./lib.mjs";

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const LABEL = option("label", "run");
const EXAMS = Number(option("exams", 3));
const OUT = option("out", null);

/** Shows the violation just before the next frame, and times that frame to the warning on screen. */
async function warnOnce(page, uploads, cameraName) {
  const already = await page.evaluate(() => window.__metrics.warnings.length);
  const before = uploads.length;
  await page.evaluate((name) => window.__setCamera(name), cameraName);
  const started = Date.now();
  for (;;) {
    const count = await page.evaluate(() => window.__metrics.warnings.length);
    if (count > already) break;
    if (Date.now() - started > 30000) return null;
    await sleep(25);
  }
  const shownAt = await page.evaluate((index) => window.__metrics.warnings[index].at, already);
  const sent = uploads.slice(before).filter((item) => item.start >= started);
  // The frame that confirmed it is the last one sent before the warning appeared.
  const confirming = sent.filter((item) => item.start <= shownAt).at(-1);
  return { fromSwapMs: shownAt - started, fromFirstFrameMs: sent[0] ? shownAt - sent[0].start : null, fromConfirmingFrameMs: confirming ? shownAt - confirming.start : null, framesNeeded: sent.filter((item) => item.start <= shownAt).length };
}

const browser = await launch({ headed: false });
const fixture = seed(Array.from({ length: EXAMS + 1 }, (_, i) => `m${i}`), 5);
const results = { label: LABEL, at: new Date().toISOString(), warnings: [], uploadMs: [], intervalMs: [], interactionMs: [], longTaskMs: [], termination: [] };

// Clean timing: one minute of nothing happening.
{
  const { context, page, uploads } = await newStudentPage(browser);
  await signIn(page, fixture.students.m0);
  await enterExam(page, fixture.quizzes.m0);
  await sleep(2000);
  const startIndex = uploads.length;
  for (let i = 0; i < 10; i += 1) {
    await page.getByRole("radio").or(page.getByRole("button", { name: /The right one|A wrong one/ })).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(3000);
    await page.getByRole("button", { name: "Next" }).or(page.getByRole("button", { name: /next question/i })).first().click({ timeout: 1000 }).catch(() => {});
    await sleep(3000);
  }
  const frames = uploads.slice(startIndex);
  results.intervalMs = frames.slice(1).map((item, index) => item.start - frames[index].start);
  results.uploadMs = frames.filter((item) => item.end).map((item) => item.end - item.start);
  const metrics = await page.evaluate(() => window.__metrics);
  results.interactionMs = metrics.interactions;
  results.longTaskMs = metrics.longTasks;
  await context.close();
}

// Warnings and terminations, on the real AI with fixture photos.
for (let exam = 1; exam <= EXAMS; exam += 1) {
  const name = `m${exam}`;
  const { context, page, uploads } = await newStudentPage(browser);
  await signIn(page, fixture.students[name]);
  await enterExam(page, fixture.quizzes[name]);
  await sleep(6000);

  const first = await warnOnce(page, uploads, "phone");
  if (first) results.warnings.push({ exam, kind: "first", ...first });
  await page.evaluate(() => window.__setCamera("face"));
  await sleep(16000);
  const second = await warnOnce(page, uploads, "other");
  if (second) results.warnings.push({ exam, kind: "second", ...second });
  await page.evaluate(() => window.__setCamera("face"));
  await sleep(16000);

  const swap = Date.now();
  await page.evaluate(() => window.__setCamera("phone"));
  for (;;) {
    const { ended, endedNotice } = await page.evaluate(() => window.__metrics);
    if (ended) {
      const frame = uploads.filter((item) => item.start <= endedNotice).at(-1);
      results.termination.push({ exam, fromSwapMs: ended - swap, fromLastUploadMs: frame ? ended - frame.start : null, closedFromLastUploadMs: frame ? endedNotice - frame.start : null });
      break;
    }
    if (Date.now() - swap > 60000) {
      results.termination.push({ exam, timedOut: true });
      break;
    }
    await sleep(25);
  }
  await context.close();
}

await browser.close();

const summary = {
  label: LABEL,
  warningFromConfirmingFrameMs: stats(results.warnings.map((item) => item.fromConfirmingFrameMs).filter((value) => value !== null)),
  warningFromFirstFrameMs: stats(results.warnings.map((item) => item.fromFirstFrameMs).filter((value) => value !== null)),
  framesNeededForWarning: results.warnings.map((item) => item.framesNeeded),
  warningFromViolationAppearingMs: stats(results.warnings.map((item) => item.fromSwapMs)),
  examClosedFromFinalFrameMs: stats(results.termination.map((item) => item.closedFromLastUploadMs).filter((value) => typeof value === "number")),
  terminationFromUploadMs: stats(results.termination.map((item) => item.fromLastUploadMs).filter((value) => typeof value === "number")),
  terminationFromViolationMs: stats(results.termination.map((item) => item.fromSwapMs).filter((value) => typeof value === "number")),
  terminationsTimedOut: results.termination.filter((item) => item.timedOut).length,
  captureIntervalMs: stats(results.intervalMs),
  uploadDurationMs: stats(results.uploadMs),
  answerInteractionMs: stats(results.interactionMs),
  longTasks: stats(results.longTaskMs),
};
console.log(JSON.stringify(summary, null, 2));
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, results }, null, 2));
