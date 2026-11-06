/**
 * The Start exam gate in real Chrome: what it sees, what it cannot see, and how it fails.
 *
 *   A  the route as shipped: the browser itself refuses screen capture on this page
 *   B  header removed, so a real capture can run here: the only case the page can detect
 *   C  a real capture in another tab: undetectable by this page, and the report says so
 *   D  camera stops just before Start, a double click, a failing start request, and retrying
 *
 *   node scripts/proctoring-e2e/readiness-check.mjs
 */
import { execFileSync, spawn } from "node:child_process";

import { confirmRecordingClosed, continueToStart, enterExam, launch, newStudentPage, seed, signIn, sleep, WEB } from "./lib.mjs";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
};

const startButton = (page) => page.getByRole("button", { name: "Start exam" });

/** getDisplayMedia needs a real click, so the page gets a button to press. */
const captureFromClick = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const button = document.createElement("button");
        button.id = "test-capture";
        button.style = "position:fixed;left:0;top:0;width:40px;height:40px;z-index:99999";
        button.onclick = async () => {
          button.remove();
          try {
            window.__testStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            window.__captureResult = "started";
          } catch (error) {
            window.__captureResult = error.name;
          }
        };
        document.body.append(button);
        resolve();
      })
  );

const fixture = seed(["gateA", "gateB", "gateC", "gateD"], 3);
// Chrome treats a page handed back by the test (scenario B) as non-local and would block its scripts.
const browser = await launch({ headed: false, extraArgs: ["--disable-features=CalculateNativeWinOcclusion,LocalNetworkAccessChecks"] });

// ---- A ----
{
  const { context, page } = await newStudentPage(browser);
  await signIn(page, fixture.students.gateA);
  await enterExam(page, fixture.quizzes.gateA, { start: false });
  check("A: Start exam is off until the recording confirmation is ticked", await startButton(page).isDisabled());
  await captureFromClick(page);
  await page.click("#test-capture");
  await sleep(500);
  const said = await page.evaluate(() => window.__captureResult);
  check("A: the browser refuses screen capture on the exam page", said === "NotAllowedError", said);
  check("A: a refused capture does not count as running", (await page.getByText(/A screen capture is running/).count()) === 0);
  await confirmRecordingClosed(page);
  check("A: ticking it turns Start exam on", await startButton(page).isEnabled());
  await context.close();
}

// ---- B ----
{
  const { context, page } = await newStudentPage(browser);
  await signIn(page, fixture.students.gateB);
  await page.route(`${WEB}/student/proctored/**`, async (route) => {
    // The dev server listens on 127.0.0.1, which "localhost" does not always reach from outside the browser.
    const response = await route.fetch({ url: route.request().url().replace("//localhost", "//127.0.0.1") });
    const headers = { ...response.headers() };
    // The body handed back here is already unpacked.
    delete headers["content-encoding"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    headers["permissions-policy"] = "camera=(self), microphone=(self), fullscreen=(self), geolocation=()";
    await route.fulfill({ response, headers });
  });
  const starts = [];
  page.on("request", (request) => {
    if (/\/proctoring\/attempts\/[^/]+\/start$/.test(request.url())) starts.push(request.postData());
  });
  await enterExam(page, fixture.quizzes.gateB, { start: false });
  await confirmRecordingClosed(page);
  await captureFromClick(page);
  await page.click("#test-capture");
  await page.waitForFunction(() => window.__captureResult, null, { timeout: 15000 });
  const said = await page.evaluate(() => window.__captureResult);
  check("B: with the header removed, a real capture runs on this page", said === "started", said);
  await sleep(300);
  check("B: it is seen, and the student is told in plain words", (await page.getByText(/A screen capture is running in this browser/).count()) === 1);
  check("B: Start exam goes off", await startButton(page).isDisabled());
  await page.evaluate(() => {
    for (const track of window.__testStream.getTracks()) {
      track.stop();
      track.dispatchEvent(new Event("ended"));
    }
  });
  await sleep(300);
  check("B: once it stops, the message goes", (await page.getByText(/A screen capture is running in this browser/).count()) === 0);
  check("B: and Start exam comes back on", await startButton(page).isEnabled());
  await startButton(page).click();
  await page.getByText(/Question 1|Answered/).first().waitFor({ timeout: 60000 });
  check("B: the exam then starts, reporting no capture", starts.length === 1 && JSON.parse(starts[0]).readiness.screenCaptureSessions === 0, starts[0]);
  await context.close();
}

// ---- C ----
{
  const { context, page } = await newStudentPage(browser);
  await signIn(page, fixture.students.gateC);
  // Another tab, on a page with no restriction, really capturing.
  const other = await context.newPage();
  await other.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await captureFromClick(other);
  await other.click("#test-capture");
  await other.waitForFunction(() => window.__captureResult, null, { timeout: 15000 });
  const otherSaid = await other.evaluate(() => window.__captureResult);
  const live = await other.evaluate(() => window.__testStream?.getVideoTracks()[0]?.readyState ?? null);
  console.log(`[INFO] C: capture in another tab: ${otherSaid}, track ${live}`);

  let recorder = null;
  try {
    execFileSync("where", ["ffmpeg"], { stdio: "ignore" });
    // A real screen recorder outside the browser. Its output is discarded, and nothing is stored.
    recorder = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "gdigrab", "-framerate", "5", "-i", "desktop", "-t", "60", "-f", "null", "-"], { stdio: "ignore" });
    console.log("[INFO] C: ffmpeg is capturing the desktop to nowhere");
  } catch {
    console.log("[INFO] C: ffmpeg is not installed here, so no separate recorder application was run");
  }

  await page.bringToFront();
  await enterExam(page, fixture.quizzes.gateC, { start: false });
  await confirmRecordingClosed(page);
  const seen = (await page.getByText(/A screen capture is running/).count()) > 0;
  check("C: KNOWN LIMIT, recorded not fixed: the page cannot see a capture outside itself", otherSaid === "started" && live === "live" && !seen && (await startButton(page).isEnabled()), `detected: ${seen}`);
  recorder?.kill();
  await context.close();
}

// ---- D ----
{
  const { context, page } = await newStudentPage(browser);
  await signIn(page, fixture.students.gateD);
  await enterExam(page, fixture.quizzes.gateD, { start: false });
  await confirmRecordingClosed(page);

  // The request fails: the student is told, stays here, nothing is locked, and can try again.
  let failNext = true;
  const starts = [];
  await page.route("**/proctoring/attempts/*/start", async (route) => {
    starts.push(Date.now());
    if (failNext) {
      failNext = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, code: "PROCTORING_UNAVAILABLE", message: "Exam monitoring is unavailable right now." }) });
    } else {
      await route.continue();
    }
  });
  await startButton(page).click();
  await page.getByRole("alert").filter({ hasText: /monitoring is unavailable/i }).waitFor({ timeout: 10000 });
  await sleep(400);
  check("D: a monitoring failure at start is shown, and the exam does not begin", (await startButton(page).count()) === 1 && (await page.evaluate(() => !document.fullscreenElement)));
  check("D: Start exam can be pressed again", await startButton(page).isEnabled());

  // The camera dies after the checks went green.
  await page.evaluate(() => document.querySelector("video").srcObject.getVideoTracks().forEach((track) => track.stop()));
  const before = starts.length;
  await startButton(page).click();
  await sleep(500);
  check("D: a camera stopped just before Start is caught at the click, with no request sent", starts.length === before && (await page.getByText(/Your camera has stopped/).count()) === 1);
  check("D: and no fullscreen was entered for it", await page.evaluate(() => !document.fullscreenElement));

  await page.getByRole("button", { name: "Retake photo" }).waitFor({ timeout: 2000 }).catch(() => {});
  await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.querySelector("video");
    video.srcObject = stream;
    await video.play();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Turn on camera/i }).click({ timeout: 30000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
  await page.getByRole("button", { name: /Retake photo|Take photo/ }).first().waitFor({ timeout: 30000 });
  await continueToStart(page);
  await sleep(1500);
  await confirmRecordingClosed(page);
  const beforeDouble = starts.length;
  await startButton(page).dblclick();
  await page.getByText(/Question 1|Answered/).first().waitFor({ timeout: 60000 });
  check("D: a double click sends one start", starts.length === beforeDouble + 1, `${starts.length - beforeDouble} sent`);
  await context.close();
}

await browser.close();
console.log(failures ? `${failures} failed` : "All passed");
if (failures) process.exitCode = 1;
