/**
 * The whole path once, on the real AI: answers saved, Esc held, a phone shown until the exam ends,
 * then what the student sees, what the instructor and admin can review, and an unproctored quiz
 * beside it that must know nothing of any of this.
 *
 *   node scripts/proctoring-e2e/instructor-check.mjs [--shots=<folder>]
 */
import path from "node:path";

import { dismissStudentTour, enterExam, launch, newStudentPage, seed, signIn, sleep, WEB } from "./lib.mjs";

const SHOTS = process.argv.find((arg) => arg.startsWith("--shots="))?.split("=")[1] ?? null;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
};

const fixture = seed(["ended", "plain"], 3);
const browser = await launch({ headed: false });

// ---- the student ----
{
  const { context, page } = await newStudentPage(browser);
  await signIn(page, fixture.students.ended);
  await enterExam(page, fixture.quizzes.ended);
  await sleep(1500);
  await page.getByRole("button", { name: /^Question 1,/ }).click();
  await page.getByRole("button", { name: /The right one/ }).first().click();
  await page.getByRole("button", { name: /^Question 2,/ }).click();
  await page.getByRole("button", { name: /A wrong one/ }).first().click();
  // Long enough after the click that the browser will not let the page restore fullscreen by itself.
  await sleep(6000);

  const cdp = await context.newCDPSession(page);
  const key = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
  for (const until = Date.now() + 3000; Date.now() < until;) {
    await sleep(100);
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", autoRepeat: true, ...key });
  }
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
  await sleep(1000);
  check("student: leaving fullscreen hides the exam and states the warning", (await page.getByRole("dialog", { name: /fullscreen/i }).getByRole("alert").count()) === 1);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "fullscreen-overlay.png") });
  await page.mouse.click(30, 30);
  await sleep(1500);
  check("student: a click brings fullscreen back", await page.evaluate(() => Boolean(document.fullscreenElement)));

  // Warning 2, a clear spell so that episode ends, then warning 3, which ends the exam. This fixture
  // scores 0.59, under the 0.6 that would end an exam for the phone alone, so it takes the warnings.
  await page.evaluate(() => window.__setCamera("phone"));
  await page.getByText(/2\/3/).first().waitFor({ timeout: 30000 });
  await page.evaluate(() => window.__setCamera("face"));
  await sleep(16000);
  await page.evaluate(() => window.__setCamera("phone"));
  await page.locator("h1").filter({ hasText: "Exam ended by proctoring" }).waitFor({ timeout: 60000 });
  await sleep(500);
  check("student: the screen says it was ended by proctoring", (await page.locator("h1").filter({ hasText: "Exam ended by proctoring" }).count()) === 1);
  check("student: the reason shown is the server's", (await page.getByText(/phone|prohibited|warning limit/i).count()) > 0);
  check("student: the answers saved before it ended are there", (await page.getByRole("tab", { name: /Answers\s*2\/3/ }).count()) === 1);
  const overviewWarnings = await page.locator("#ended-panel-overview").getByText("3 / 3", { exact: true }).count();
  check("student: the exam released fullscreen", await page.evaluate(() => !document.fullscreenElement));
  await sleep(2500);
  check("student: and nothing brought it back", await page.evaluate(() => !document.fullscreenElement));
  await page.mouse.click(30, 300);
  await sleep(800);
  check("student: not even a click on the result page", await page.evaluate(() => !document.fullscreenElement));
  await page.getByRole("tab", { name: /Why it ended/ }).click();
  check("student: the warning count agrees with the reason and the warnings tab", overviewWarnings === 1 && (await page.getByText("Warning 3 of 3").count()) === 1);
  const shown = await page.locator("#ended-panel-warnings ol > li").count();
  check("student: the warnings tab shows each warning with its photo", shown >= 1, `${shown} cards`);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "ended-real-termination.png") });
  await context.close();
}

// ---- the instructor, then the admin ----
let attemptId = null;
const ID_IN_ADDRESS = /[0-9a-f]{8}-[0-9a-f]{4}-|\bc[a-z0-9]{20,}\b/i;
for (const [role, person, base] of [["instructor", fixture.instructor, "/instructor/proctoring"], ["admin", fixture.admin, "/admin/proctoring"]]) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await signIn(page, person);
  await page.goto(`${WEB}${base}`, { waitUntil: "domcontentloaded" });
  // The LMS's own "unread notifications" greeting after a sign-in, here because a review is waiting.
  const greeting = page.locator(".fixed.inset-0.z-\\[9999\\]").getByRole("button").first();
  await greeting.click({ timeout: 6000 }).catch(() => {});
  if (attemptId) {
    // An admin's list covers every course, so this attempt may be further down it.
    await page.locator("table tbody tr, [role='row']").first().waitFor({ timeout: 30000 });
    check(`${role}: the review list loads`, true);
    await page.goto(`${WEB}${base}/${attemptId}`, { waitUntil: "domcontentloaded" });
  } else {
    const row = page.getByText(new RegExp(`student-ended|ended ${fixture.stamp}`)).first();
    await row.waitFor({ timeout: 30000 });
    check(`${role}: the ended attempt is in the review list`, true);
    const reviewRead = page.waitForRequest((request) => /\/proctoring\/reviews\/[^/?]+$/.test(request.url()), { timeout: 30000 });
    await row.click();
    attemptId = (await reviewRead).url().split("/").pop();
    await page.waitForURL(/\/proctoring\/[^/]+$/, { timeout: 30000 });
  }
  await page.getByText(/Left fullscreen/).first().waitFor({ timeout: 30000 });
  await sleep(300);
  const address = new URL(page.url()).pathname;
  console.log(`[INFO] ${role} address: ${address}`);
  check(`${role}: the review's address has no id`, !ID_IN_ADDRESS.test(page.url()), page.url());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(/Left fullscreen/).first().waitFor({ timeout: 30000 });
  check(`${role}: a refresh returns to the same review, at the same address`, new URL(page.url()).pathname === address);
  check(`${role}: the fullscreen exit is on the timeline`, true);
  const detail = await page.getByText(/Esc held for \d/).first().innerText().catch(() => "");
  check(`${role}: with how it happened`, /Keyboard lock on/.test(detail), detail);
  await page.waitForFunction(() => [...document.querySelectorAll("img")].some((image) => image.src.startsWith("blob:") && image.naturalWidth > 0), null, { timeout: 30000 }).then(() => check(`${role}: evidence photos load`, true), () => check(`${role}: evidence photos load`, false));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${role}-review.png`) });
  // Another tab has no review to go with this address, and goes to the list instead of breaking.
  const other = await context.newPage();
  await other.goto(`${WEB}${address}`, { waitUntil: "domcontentloaded" });
  await other.waitForURL(new RegExp(`${base}$`), { timeout: 30000 }).then(() => check(`${role}: the address pasted into a new tab goes to the list`, true), () => check(`${role}: the address pasted into a new tab goes to the list`, false, other.url()));
  await other.close();
  await context.close();
}

// ---- an unproctored quiz ----
{
  const { context, page } = await newStudentPage(browser);
  const monitoring = [];
  page.on("request", (request) => {
    if (request.url().includes("/proctoring/monitor/") || /\/proctoring\/(quizzes|attempts)\//.test(request.url())) monitoring.push(request.url());
  });
  await signIn(page, fixture.students.plain);
  await page.goto(`${WEB}/student/attempt/${fixture.quizzes.plain}?courseId=${fixture.courseId}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("button", { name: /^Question 1,/ }).waitFor({ timeout: 60000 });
  await dismissStudentTour(page);
  for (let index = 1; index <= 3; index += 1) {
    await page.getByRole("button", { name: new RegExp(`^Question ${index},`) }).click({ timeout: 15000 });
    await page.getByRole("button", { name: /The right one/ }).first().click();
  }
  await sleep(300);
  check("unproctored: no camera, no fullscreen, no monitoring requests", monitoring.length === 0 && (await page.evaluate(() => !document.fullscreenElement)), `${monitoring.length} requests`);
  await page.getByRole("button", { name: /^Submit/ }).first().click();
  await sleep(500);
  await page.locator(".fixed.inset-0.z-50").getByRole("button").last().click({ timeout: 5000 });
  // An ordinary quiz shows its result on the same page.
  await page.getByText(/View Full Result/).waitFor({ timeout: 45000 }).then(() => check("unproctored: it submits as before", true), () => check("unproctored: it submits as before", false, page.url()));
  check("unproctored: still no monitoring requests", monitoring.length === 0, `${monitoring.length} requests`);
  await context.close();
}

await browser.close();
console.log(failures ? `${failures} failed` : "All passed");
if (failures) process.exitCode = 1;
