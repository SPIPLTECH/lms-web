/**
 * A real operating-system Esc key against Keyboard Lock in real Chrome. The window gets a unique
 * title, and the key is sent only if that exact window is in the foreground, so it can never land
 * in anything else on the desktop. Needs an unlocked, interactive session.
 *
 *   node scripts/proctoring-e2e/os-key-probe.mjs [--no-lock]
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

import { WEB, sleep } from "./lib.mjs";

const NO_LOCK = process.argv.includes("--no-lock");
const TITLE = `E2E-KEY-PROBE-${crypto.randomBytes(4).toString("hex")}`;

function pressEsc(holdMs) {
  const script = `
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class K {
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
}
"@
$p = Get-Process | Where-Object { $_.MainWindowTitle -like '*${TITLE}*' } | Select-Object -First 1
if ($p) { try { [Microsoft.VisualBasic.Interaction]::AppActivate($p.Id) } catch {} ; Start-Sleep -Milliseconds 500 }
$b = New-Object System.Text.StringBuilder 512; [K]::GetWindowText([K]::GetForegroundWindow(), $b, 512) | Out-Null
if ($b.ToString() -notlike '*${TITLE}*') { Write-Output "NOT_SENT: the test window was not in the foreground"; exit 0 }
[K]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds ${holdMs}
[K]::keybd_event(0x1B, 0, 2, [UIntPtr]::Zero)
Write-Output "SENT"
`;
  return execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" }).trim();
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "os-key-probe-"));
const context = await chromium.launchPersistentContext(profile, { channel: "chrome", headless: false, viewport: null, ignoreDefaultArgs: ["--enable-automation"] });
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.evaluate(
  ({ title, noLock }) => {
    document.title = title;
    new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    }).observe(document.querySelector("title"), { childList: true });
    window.__keys = [];
    window.addEventListener("keydown", (event) => window.__keys.push(`down:${event.key}:${event.repeat}`), true);
    document.addEventListener(
      "click",
      async () => {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        window.__lock = noLock ? "not requested" : "pending";
        if (!noLock) await navigator.keyboard.lock().then(() => (window.__lock = "resolved"), (error) => (window.__lock = `rejected: ${error.name}`));
      },
      { once: true }
    );
  },
  { title: TITLE, noLock: NO_LOCK }
);
await page.mouse.click(10, 10);
await sleep(1500);
const read = () => page.evaluate(() => ({ fullscreen: Boolean(document.fullscreenElement), lock: window.__lock, keys: window.__keys.length, firstKey: window.__keys[0] ?? null }));

const report = { noLock: NO_LOCK, before: await read() };
report.shortPress = pressEsc(100);
await sleep(1500);
report.afterShortPress = await read();
if (report.afterShortPress.fullscreen) {
  report.heldPress = pressEsc(2500);
  await sleep(1500);
  report.afterHeldPress = await read();
}
console.log(JSON.stringify(report, null, 2));
await context.close();
fs.rmSync(profile, { recursive: true, force: true });
