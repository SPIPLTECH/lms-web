/**
 * How long each step of entering and finishing an exam takes in real Chrome, and each API call it
 * makes. This is the part of the experience a student waits for.
 *
 *   node scripts/proctoring-e2e/flow-timing.mjs --label=before [--runs=3] [--questions=50]
 */
import { confirmRecordingClosed, continueToStart, launch, newStudentPage, percentile, seed, signIn, sleep, WEB } from "./lib.mjs";

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const RUNS = Number(option("runs", 3));
const QUESTIONS = Number(option("questions", 50));

const fixture = seed(Array.from({ length: RUNS }, (_, i) => `f${i}`), QUESTIONS);
const browser = await launch({ headed: false });
const steps = {};
const calls = {};
const note = (bag, key, value) => (bag[key] ??= []).push(value);

for (let run = 0; run < RUNS; run += 1) {
  const name = `f${run}`;
  const { context, page } = await newStudentPage(browser);
  const started = new Map();
  page.on("request", (request) => {
    if (request.url().includes("/proctoring/") && !request.url().includes("/monitor/")) started.set(request, Date.now());
  });
  page.on("requestfinished", (request) => {
    if (!started.has(request)) return;
    const route = `${request.method()} ${new URL(request.url()).pathname.replace(/[0-9a-z-]{20,}/gi, ":id")}`;
    note(calls, route, Date.now() - started.get(request));
  });
  await signIn(page, fixture.students[name]);

  const step = async (label, action) => {
    const at = Date.now();
    await action();
    note(steps, label, Date.now() - at);
  };
  await step("open exam page until the notice shows", async () => {
    await page.goto(`${WEB}/student/proctored/${fixture.quizzes[name]}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByRole("checkbox", { name: /I have read this notice/i }).waitFor({ timeout: 60000 });
  });
  await page.getByRole("checkbox", { name: /I have read this notice/i }).check();
  await step("agree and continue", async () => {
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await page.getByRole("button", { name: /Turn on camera (&|and) mic/i }).waitFor({ timeout: 30000 });
  });
  await step("camera on", async () => {
    await page.getByRole("button", { name: /Turn on camera (&|and) mic/i }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
    await page.getByRole("button", { name: "Take photo", exact: true }).waitFor({ timeout: 30000 });
  });
  await sleep(800);
  await step("identity photo checked", async () => {
    await page.getByRole("button", { name: "Take photo", exact: true }).click();
    await page.getByRole("button", { name: "Retake photo" }).waitFor({ timeout: 30000 });
  });
  await continueToStart(page);
  await confirmRecordingClosed(page);
  await step("start until the first question shows", async () => {
    await page.getByRole("button", { name: "Start exam" }).click();
    await page.getByText(/Sample question/).first().waitFor({ timeout: 60000 });
  });
  await sleep(1000);
  const option0 = page.getByRole("button", { name: /The right one/ }).first();
  await step("answer click until it shows selected", async () => {
    await option0.click({ timeout: 10000 });
    await sleep(0);
  });
  await sleep(1500);
  await step("next question", async () => {
    await page.getByRole("button", { name: /^Question 2,/ }).click({ timeout: 5000 });
    await page.getByText(/Sample question 2/).waitFor({ timeout: 5000 });
  });
  await step("answer every question, then submit", async () => {
    const total = await page.getByRole("button", { name: /^Question \d+,/ }).count();
    for (let index = 1; index <= total; index += 1) {
      await page.getByRole("button", { name: new RegExp(`^Question ${index},`) }).click({ timeout: 5000 }).catch(() => {});
      await page.getByRole("button", { name: /The right one/ }).first().click({ timeout: 5000 });
    }
    await page.getByRole("button", { name: /^Submit/ }).first().click({ timeout: 10000 });
    await sleep(500);
    const clickedAt = Date.now();
    await page.locator(".fixed.inset-0.z-50").getByRole("button").last().click({ timeout: 5000 });
    await page.locator("h1").filter({ hasText: /Exam passed|Exam completed|Exam submitted/ }).waitFor({ timeout: 45000 }).catch(async (error) => {
      console.error("The outcome never showed. On screen:", (await page.locator("body").innerText()).slice(0, 900).replace(/\n+/g, " | "));
      throw error;
    });
    note(steps, "confirm submit until the outcome shows", Date.now() - clickedAt);
  });
  await context.close();
}
await browser.close();

const fold = (bag) => Object.fromEntries(Object.entries(bag).map(([key, values]) => [key, { n: values.length, p50: percentile(values, 0.5), max: Math.max(...values) }]));
console.log(JSON.stringify({ label: option("label", "run"), questions: QUESTIONS, steps: fold(steps), apiCalls: fold(calls) }, null, 1));
