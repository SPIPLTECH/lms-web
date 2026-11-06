/**
 * What the browser really does with Escape in a proctored exam, with a control:
 *
 *   control   Keyboard Lock unavailable: a short Esc must exit fullscreen. This proves the key press
 *             method reaches the browser's own fullscreen handling.
 *   locked    Keyboard Lock active: a short Esc should stay, and a long hold should exit.
 *   ordinary  The permission state a normal Chrome profile starts with, no automation shortcuts.
 *
 * The key goes through Chrome's input pipeline (DevTools protocol), so it needs no window focus
 * and cannot land in anything else on the desktop.
 *
 *   node scripts/proctoring-e2e/esc-probe.mjs [--channel=chrome|msedge]
 */
import { chromium } from "playwright";

import { cameraScript, enterExam, PHOTOS, seed, signIn, sleep } from "./lib.mjs";

const channel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=")[1] ?? "chrome";

const state = (page) =>
  page.evaluate(async () => {
    const permission = await navigator.permissions.query({ name: "keyboard-lock" }).then((p) => p.state, (e) => `query failed: ${e.name}`);
    return {
      fullscreen: Boolean(document.fullscreenElement),
      permission,
      lock: window.__lastLock ?? null,
      warnings: (window.__metrics?.warnings ?? []).map((item) => item.text),
      exitOverlay: Boolean(document.querySelector('[role="dialog"][aria-label*="fullscreen" i]')),
    };
  });

async function hold(page, cdp, ms) {
  const key = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await sleep(100);
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", autoRepeat: true, isSystemKey: false, ...key }).catch(() => {});
  }
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
  await sleep(1200);
}

async function run(name, { fakeUi, disableLock }, fixture, report) {
  const browser = await chromium.launch({
    channel,
    headless: false,
    args: ["--use-fake-device-for-media-stream", "--window-size=1366,800", ...(fakeUi ? ["--use-fake-ui-for-media-stream"] : [])],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.grantPermissions(["camera", "microphone"]);
  const page = await context.newPage();
  await page.addInitScript(cameraScript, PHOTOS);
  await page.addInitScript((disabled) => {
    const original = navigator.keyboard?.lock?.bind(navigator.keyboard);
    if (!original) return;
    navigator.keyboard.lock = (...args) => {
      if (disabled) {
        window.__lastLock = "disabled by the control";
        return Promise.reject(new DOMException("disabled", "NotAllowedError"));
      }
      window.__lastLock = "pending";
      return original(...args).then(
        (value) => {
          window.__lastLock = "resolved";
          return value;
        },
        (error) => {
          window.__lastLock = `rejected: ${error.name}`;
          throw error;
        }
      );
    };
  }, disableLock);
  const cdp = await context.newCDPSession(page);
  const result = {};
  try {
    await signIn(page, fixture.students[name]);
    await enterExam(page, fixture.quizzes[name]);
    await sleep(3000);
    result.afterStart = await state(page);
    await hold(page, cdp, 60);
    result.afterShortEsc = await state(page);
    if (result.afterShortEsc.fullscreen) {
      await hold(page, cdp, 3000);
      result.afterHeldEsc = await state(page);
    }
    const overlay = page.getByRole("button", { name: "Return to fullscreen" });
    result.overlayButton = await overlay.isVisible().catch(() => false);
    if (result.overlayButton) {
      await overlay.click();
      await sleep(1500);
      result.afterRestore = await state(page);
      await hold(page, cdp, 60);
      result.afterRestoreShortEsc = await state(page);
    }
  } catch (error) {
    result.error = String(error.message).slice(0, 300);
    result.stateAtError = await state(page).catch(() => null);
  }
  report[name] = result;
  await browser.close();
}

const fixture = seed(["control", "locked", "ordinary"], 3);
const report = { channel };
await run("control", { fakeUi: true, disableLock: true }, fixture, report);
await run("locked", { fakeUi: true, disableLock: false }, fixture, report);
await run("ordinary", { fakeUi: false, disableLock: false }, fixture, report);
console.log(JSON.stringify(report, null, 2));
