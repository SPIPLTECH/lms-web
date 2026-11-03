/**
 * What Keyboard Lock does in a plain Chrome profile: no automation shortcuts, nothing pre-granted.
 * Uses the isolated web server's login page as a same-origin secure context, and touches no account.
 *
 *   node scripts/proctoring-e2e/lock-probe.mjs [--channel=chrome|msedge]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

import { WEB, sleep } from "./lib.mjs";

const channel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=")[1] ?? "chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lock-probe-"));

const context = await chromium.launchPersistentContext(profile, {
  channel,
  headless: false,
  viewport: null,
  ignoreDefaultArgs: ["--enable-automation", "--disable-popup-blocking"],
  args: process.argv.filter((arg) => arg.startsWith("--enable-features=")),
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });

const read = () =>
  page.evaluate(async () => ({
    secure: window.isSecureContext,
    api: typeof navigator.keyboard?.lock === "function",
    permission: await navigator.permissions.query({ name: "keyboard-lock" }).then((p) => p.state, (e) => `query failed: ${e.name}`),
    fullscreen: Boolean(document.fullscreenElement),
    lock: window.__lock ?? null,
  }));

const report = { channel, before: await read() };
await page.evaluate(() => {
  window.__click = async () => {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    window.__lock = "pending";
    navigator.keyboard.lock().then(
      () => (window.__lock = "resolved"),
      (error) => (window.__lock = `rejected: ${error.name}: ${error.message}`)
    );
  };
  document.addEventListener("click", () => window.__click(), { once: true });
});
await page.mouse.click(10, 10);
await sleep(1500);
report.oneSecondAfter = await read();
await sleep(6000);
report.sevenSecondsAfter = await read();
await page.screenshot({ path: path.join(os.tmpdir(), `lock-probe-${channel}.png`) }).catch(() => {});

const cdp = await context.newCDPSession(page);
const key = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
await sleep(60);
await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
await sleep(1200);
report.afterShortEsc = await read();

console.log(JSON.stringify(report, null, 2));
await context.close();
fs.rmSync(profile, { recursive: true, force: true });
