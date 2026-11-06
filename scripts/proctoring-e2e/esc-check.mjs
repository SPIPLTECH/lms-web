/**
 * Esc and fullscreen on the finished exam page, with a control where Keyboard Lock is refused. The
 * key goes through Chrome's input pipeline (DevTools protocol). That proves what the page and the
 * browser's fullscreen handling do, but it is not a key on a physical keyboard: report it as such.
 *
 *   node scripts/proctoring-e2e/esc-check.mjs [--channel=chrome|msedge] [--headed]
 */
import { chromium } from "playwright";

import { cameraScript, enterExam, PHOTOS, seed, signIn, sleep } from "./lib.mjs";

const channel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=")[1] ?? "chrome";
const headed = process.argv.includes("--headed");

const state = (page) =>
  page.evaluate(() => ({
    fullscreen: Boolean(document.fullscreenElement),
    overlay: Boolean(document.querySelector('[role="dialog"][aria-label*="fullscreen" i]')),
    overlayWarning: document.querySelector('[role="dialog"][aria-label*="fullscreen" i] [role="alert"]')?.textContent ?? null,
  }));

async function pressEsc(cdp, ms) {
  const key = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await sleep(100);
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", autoRepeat: true, ...key }).catch(() => {});
  }
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

async function run(name, disableLock, fixture) {
  const browser = await chromium.launch({
    channel,
    headless: !headed,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--window-size=1366,800", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion"],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.grantPermissions(["camera", "microphone"]);
  const page = await context.newPage();
  await page.addInitScript(cameraScript, PHOTOS);
  if (disableLock) {
    await page.addInitScript(() => {
      if (navigator.keyboard) navigator.keyboard.lock = () => Promise.reject(new DOMException("disabled", "NotAllowedError"));
    });
  }
  const events = [];
  const uploads = [];
  const exits = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/monitor/events")) {
      const body = request.postDataJSON();
      events.push({ at: Date.now(), ...body });
      if (body.eventType === "FULLSCREEN_EXIT") exits.push(Date.now());
    }
    if (url.includes("/monitor/snapshots")) {
      // The form holds a binary photo, so its fields cannot be read here. The timing says enough:
      // periodic frames are 5 s apart, so one just after the exit is the incident photo.
      uploads.push({ at: Date.now() });
    }
  });
  const cdp = await context.newCDPSession(page);
  const result = { name };
  await signIn(page, fixture.students[name]);
  await enterExam(page, fixture.quizzes[name]);
  await sleep(3000);
  result.afterStart = await state(page);
  result.permission = await page.evaluate(() => navigator.permissions.query({ name: "keyboard-lock" }).then((p) => p.state, () => "unknown"));

  await pressEsc(cdp, 60);
  await sleep(1200);
  result.afterShortEsc = await state(page);
  result.exitsAfterShortEsc = exits.length;

  if (result.afterShortEsc.fullscreen) {
    // Ordinary work still functions under the lock: choosing an answer, and moving with the keyboard.
    await page.getByRole("button", { name: /The right one/ }).first().click();
    await page.keyboard.press("Tab");
    result.tabMovesFocus = await page.evaluate(() => document.activeElement && document.activeElement !== document.body);
    await sleep(6000);
    const pressedAt = Date.now();
    await pressEsc(cdp, 3000);
    await sleep(600);
    result.afterHeldEsc = await state(page);
    result.heldEscExitAfterMs = exits[0] ? exits[0] - pressedAt : null;
  }

  const exit = events.find((event) => event.eventType === "FULLSCREEN_EXIT");
  result.exitMetadata = exit?.metadata ?? null;
  const nextUpload = exit ? uploads.find((item) => item.at >= exit.at) : null;
  const previousUpload = exit ? uploads.filter((item) => item.at < exit.at).at(-1) : null;
  result.photoAfterExitMs = nextUpload ? nextUpload.at - exit.at : null;
  result.previousPhotoBeforeExitMs = previousUpload ? exit.at - previousUpload.at : null;
  const shownAt = await page.evaluate(() => window.__metrics.warnings[0]?.at ?? null);
  result.warningAfterExitMs = shownAt && exit ? shownAt - exit.at : null;
  await sleep(2500);
  result.twoSecondsLater = await state(page);
  result.autoRestoredWithNoGesture = result.twoSecondsLater.fullscreen;

  if (!result.twoSecondsLater.fullscreen) {
    // Any click returns to fullscreen, without having to find the button.
    await page.mouse.click(30, 30);
    await sleep(1200);
    result.afterClickAnywhere = await state(page);
    if (!result.afterClickAnywhere.fullscreen) {
      await page.getByRole("button", { name: "Return to fullscreen" }).click();
      await sleep(1200);
      result.afterButton = await state(page);
    }
  }
  result.exitsRecorded = events.filter((event) => event.eventType === "FULLSCREEN_EXIT").length;
  await pressEsc(cdp, 60);
  await sleep(1200);
  result.shortEscAfterRestore = await state(page);

  // Held straight after a click: the browser still allows a restore, so the page does it unasked.
  if (!disableLock) {
    const exitsBefore = exits.length;
    await page.getByRole("button", { name: /The right one/ }).first().click();
    await pressEsc(cdp, 2000);
    await sleep(800);
    result.heldJustAfterClick = { ...(await state(page)), newExits: exits.length - exitsBefore, keyboardLockAfter: await page.evaluate(() => navigator.keyboard ? "api present" : "no api") };
    await pressEsc(cdp, 60);
    await sleep(800);
    result.heldJustAfterClick.shortEscThen = (await state(page)).fullscreen;
  }
  await browser.close();
  return result;
}

const fixture = seed(["esccontrol", "esclocked"], 3);
const report = { channel, input: "DevTools protocol, not a physical keyboard", headless: !headed };
report.control = await run("esccontrol", true, fixture);
report.locked = await run("esclocked", false, fixture);
console.log(JSON.stringify(report, null, 2));
