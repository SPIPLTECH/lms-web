/**
 * Shared set-up for the proctoring browser runs: real Chrome through Playwright, against the
 * isolated local stack only (see docs/proctoring_post_integration_validation_report.md).
 *
 * The camera is simulated: public-domain fixture photos drawn onto a canvas, swapped by the test,
 * which is the only way to know the exact moment a violation appears. Say so when reporting, and
 * keep these results apart from anything measured with a real webcam.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

export const WEB = process.env.E2E_WEB || "http://localhost:3055";
export const API = process.env.E2E_API || "http://localhost:5055";
export const API_ROOT = "C:/Orange Tree LMS/backend/lms-api";
const FIXTURES = path.join(API_ROOT, "ai/tests/fixtures");

for (const url of [WEB, API]) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(url)) throw new Error(`Refusing to run against ${url}: local only.`);
}

const dataUrl = (file) => `data:image/jpeg;base64,${fs.readFileSync(path.join(FIXTURES, file)).toString("base64")}`;

export const PHOTOS = {
  face: dataUrl("face_victor_glover.jpg"),
  faceAgain: dataUrl("face_victor_glover_2018.jpg"),
  other: dataUrl("face_raja_chari.jpg"),
  phone: dataUrl("phone_woman_holding.jpg"),
  nobody: dataUrl("phone_hand_closeup.jpg"),
};

/** Runs in every page before its own scripts: the simulated camera, and timers for what users feel. */
export function cameraScript(photos) {
  const images = {};
  let current = "face";
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext("2d");
  const draw = () => {
    const image = images[current];
    if (!image?.complete) return;
    const scale = Math.min(640 / image.width, 480 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.fillStyle = "#222";
    context.fillRect(0, 0, 640, 480);
    context.drawImage(image, (640 - width) / 2, (480 - height) / 2, width, height);
  };
  for (const [name, url] of Object.entries(photos)) {
    images[name] = new Image();
    images[name].src = url;
  }
  setInterval(draw, 100);
  window.__setCamera = (name) => {
    current = name;
    draw();
  };
  const real = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      // Goes through the browser first, so the page's real camera permission still decides.
      const device = await real(constraints);
      device.getTracks().forEach((track) => track.stop());
      if (constraints.video) return canvas.captureStream(10);
      const audio = new AudioContext();
      return audio.createMediaStreamDestination().stream;
    };
  }

  window.__metrics = { warnings: [], longTasks: [], interactions: [], ended: null, endedNotice: null };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__metrics.longTasks.push(Math.round(entry.duration));
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId) window.__metrics.interactions.push(Math.round(entry.duration));
    }
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
  const watch = () => {
    new MutationObserver(() => {
      for (const node of document.querySelectorAll('[role="alert"]')) {
        const text = node.textContent || "";
        if (/Proctoring Warning|Warning threshold|warning limit/i.test(text) && !window.__metrics.warnings.some((item) => item.text === text)) {
          window.__metrics.warnings.push({ text, at: Date.now() });
        }
      }
      // The exam closing, then the full result once the record has caught up.
      if (!window.__metrics.endedNotice && /Your exam has ended|Why it ended|Ended by proctoring|Exam ended by proctoring/.test(document.body?.innerText || "")) {
        window.__metrics.endedNotice = Date.now();
      }
      if (!window.__metrics.ended && /Why it ended|Ended by proctoring|Exam ended by proctoring/.test(document.body?.innerText || "")) {
        window.__metrics.ended = Date.now();
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  };
  if (document.documentElement) watch();
  else addEventListener("DOMContentLoaded", watch);
}

export async function launch({ headed = true, extraArgs = [], channel = "chrome" } = {}) {
  return chromium.launch({
    channel,
    headless: !headed,
    // Other windows on the desktop must not stop this one painting, or every timing is wrong.
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--window-size=1366,800", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion", ...extraArgs],
  });
}

export async function newStudentPage(browser, { width = 1366, height = 768 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.addInitScript(cameraScript, PHOTOS);
  const uploads = [];
  page.on("request", (request) => {
    if (request.url().includes("/proctoring/monitor/snapshots")) uploads.push({ start: Date.now(), request, end: null });
  });
  page.on("requestfinished", (request) => {
    const entry = uploads.find((item) => item.request === request);
    if (entry) entry.end = Date.now();
  });
  page.on("requestfailed", (request) => {
    const entry = uploads.find((item) => item.request === request);
    if (entry) entry.failed = true;
  });
  return { context, page, uploads };
}

export async function signIn(page, { email, password }) {
  await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  // A click before the page has hydrated does nothing, so it tries again until it navigates.
  for (let tries = 0; tries < 8; tries += 1) {
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    const moved = await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 8000, waitUntil: "commit" }).then(() => true, () => false);
    if (moved) return;
  }
  throw new Error("Sign-in did not complete.");
}

/** The welcome tour a brand-new student sees on the LMS's ordinary pages, declined as a student would. */
export async function dismissStudentTour(page) {
  await page.locator('[aria-labelledby="student-tour-title"]').getByRole("button", { name: "Not now" }).click({ timeout: 8000 }).catch(() => {});
}

/** From the exam page through consent, camera and identity photo to a running exam. */
export async function enterExam(page, quizId, { start = true } = {}) {
  await page.goto(`${WEB}/student/proctored/${quizId}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("checkbox", { name: /I have read this notice/i }).check({ timeout: 60000 });
  await page.getByRole("button", { name: "Agree and continue" }).click();
  await page.getByRole("button", { name: /Turn on camera and microphone/i }).click({ timeout: 30000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
  // The first frames of a stream can be blank, and a real student would simply try again.
  const retake = page.getByRole("button", { name: "Retake photo" });
  for (let tries = 0; ; tries += 1) {
    await page.getByRole("button", { name: "Take photo", exact: true }).click({ timeout: 30000 });
    const passed = await retake.waitFor({ timeout: 10000 }).then(() => true, () => false);
    if (passed) break;
    if (tries >= 5) {
      const said = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
      throw new Error(`The identity photo did not pass: ${said.join(" | ")}`);
    }
    await sleep(1500);
  }
  await continueToStart(page);
  if (start) await startExam(page);
}

/** The readiness page is one step at a time: Continue until the last step, which has Start exam. */
export async function continueToStart(page) {
  for (let tries = 0; tries < 4 && !(await page.getByRole("button", { name: "Start exam" }).count()); tries += 1) {
    await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
  }
}

/** The screen recording confirmation is a switch on the last step. */
export async function confirmRecordingClosed(page) {
  const toggle = page.getByRole("switch", { name: /recording, sharing and remote access are closed/i });
  if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
}

export async function startExam(page) {
  await continueToStart(page);
  await confirmRecordingClosed(page);
  await page.getByRole("button", { name: "Start exam" }).click();
  await page.getByText(/Question 1|Answered/).first().waitFor({ timeout: 60000 });
}

export const seed = (scenarios, questions = 3) =>
  JSON.parse(execFileSync("node", ["scripts/proctoring-local/seed.js", `--scenarios=${scenarios.join(",")}`, `--questions=${questions}`], { cwd: API_ROOT, encoding: "utf8" }));

export const percentile = (values, q) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

export const stats = (values) => ({
  n: values.length,
  min: values.length ? Math.min(...values) : null,
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  max: values.length ? Math.max(...values) : null,
});

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
