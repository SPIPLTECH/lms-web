/**
 * The exam-ended report in real Chrome at the sizes that matter, for each way an exam can end, with
 * few events and with far too many: the Overview and the warnings tab each fit without the page
 * scrolling, only warnings get a photo card, and every other event stays folded. The exam is real.
 * Only the result's event list and ending are replaced, so the same page can be seen in each state.
 *
 *   node scripts/proctoring-e2e/layout-check.mjs --shots=<folder>
 */
import path from "node:path";

import { enterExam, launch, newStudentPage, seed, signIn, sleep, WEB } from "./lib.mjs";

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const SHOTS = option("shots", null);

const SIZES = [
  { name: "laptop-1366x768", width: 1366, height: 768, fits: true },
  { name: "laptop-1280x720", width: 1280, height: 720, fits: true },
  { name: "desktop-1920x1080", width: 1920, height: 1080, fits: true },
  { name: "tablet-landscape-1024x768", width: 1024, height: 768, fits: true },
  { name: "tablet-portrait-768x1024", width: 768, height: 1024, fits: false },
  { name: "phone-390x844", width: 390, height: 844, fits: false },
];

const REASON = "Maximum proctoring warning limit reached (3/3). Your exam has been ended.";
const ENDINGS = {
  proctoring: { outcome: "ENDED_BY_PROCTORING", endedBy: "PROCTORING", status: "TERMINATED", reason: REASON, passed: false, warningCount: 3 },
  student: { outcome: "PASSED", endedBy: "STUDENT", status: "SUBMITTED", reason: null, passed: true, warningCount: 0 },
  time: { outcome: "PASSED", endedBy: "TIME", status: "TIME_EXPIRED", reason: null, passed: true, warningCount: 1 },
  other: { outcome: "ABANDONED", endedBy: null, status: "ABANDONED", reason: null, passed: false, warningCount: 0 },
};

const manyEvents = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `sample-${index}`,
    eventType: "HEAD_POSE_AWAY",
    severity: "MEDIUM",
    explanation: "You appeared to be looking away from the screen.",
    timestamp: new Date(Date.now() - (count - index) * 20000).toISOString(),
    warningNumber: index < 3 ? index + 1 : null,
    evidenceId: null,
    evidenceCapturedAt: null,
  }));

const browser = await launch({ headed: false });
const fixture = seed(["layout"], 3);
const { context, page } = await newStudentPage(browser);
await signIn(page, fixture.students.layout);
await enterExam(page, fixture.quizzes.layout);
await sleep(1000);
for (let index = 1; index <= 3; index += 1) {
  await page.getByRole("button", { name: new RegExp(`^Question ${index},`) }).click({ timeout: 5000 });
  await page.getByRole("button", { name: /The right one/ }).first().click();
}
await sleep(800);
await page.getByRole("button", { name: /^Submit/ }).first().click();
await sleep(500);
await page.locator(".fixed.inset-0.z-50").getByRole("button").last().click({ timeout: 5000 });
await page.locator("h1").filter({ hasText: /Exam passed|Exam completed/ }).waitFor({ timeout: 45000 });

let overrides = {};
await page.route("**/proctoring/attempts/*/result", async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.data = { ...json.data, ...overrides };
  await route.fulfill({ response, json });
});

const measure = () =>
  page.evaluate(() => {
    const doc = document.documentElement;
    const report = document.querySelector("main > div").getBoundingClientRect();
    const smallest = Math.min(...[...document.querySelectorAll("main p, main span, main h1, main h2, main button")].filter((node) => node.textContent.trim() && node.offsetParent).map((node) => parseFloat(getComputedStyle(node).fontSize)));
    return {
      pageScrolls: doc.scrollHeight > window.innerHeight,
      pageOverflowsSideways: doc.scrollWidth > window.innerWidth,
      topGap: Math.round(report.top),
      bottomGap: Math.round(window.innerHeight - report.bottom),
      smallestTextPx: smallest,
    };
  });

const rows = [];
for (const size of SIZES) {
  await page.setViewportSize({ width: size.width, height: size.height });
  for (const [ending, values] of Object.entries(ENDINGS)) {
    for (const events of [2, 45]) {
      overrides = { ...values, violations: manyEvents(events), violationCount: events };
      await page.goto(`${WEB}/student/proctored/${fixture.quizzes.layout}`, { waitUntil: "domcontentloaded" });
      await page.locator("#ended-panel-overview").waitFor({ timeout: 30000 });
      await sleep(150);
      const got = await measure();
      got.heading = await page.locator("h1").first().innerText();
      got.showsExactReason = ending === "proctoring" ? (await page.getByText(REASON).count()) === 1 : null;
      if (SHOTS && (events === 45 || ending === "student")) await page.screenshot({ path: path.join(SHOTS, `ended-${size.name}-${ending}-${events}-overview.png`) });

      // The warnings tab: a photo card for each warning only, and every other event folded away,
      // so a long exam does not turn into a long page.
      const warningsTab = page.getByRole("tab", { name: /Why it ended|Warnings/ });
      if (await warningsTab.count()) {
        await warningsTab.click();
        await sleep(150);
        const tab = await measure();
        got.warningsTabScrolls = tab.pageScrolls;
        got.photoCards = await page.locator("#ended-panel-warnings ol > li").count();
        got.othersFolded = (await page.locator("#ended-panel-warnings ul").count()) === 0;
        if (SHOTS && (events === 45 || ending === "student")) await page.screenshot({ path: path.join(SHOTS, `ended-${size.name}-${ending}-${events}-warnings.png`) });
      }
      const expectedCards = Math.min(events, 3);
      const centred = Math.abs(got.topGap - got.bottomGap) <= 2;
      const problems = [];
      if (size.fits && got.pageScrolls) problems.push("the page scrolls");
      if (size.fits && got.warningsTabScrolls) problems.push("the warnings tab scrolls");
      if (got.pageOverflowsSideways) problems.push("sideways overflow");
      if (size.fits && !centred) problems.push("not centred");
      if (got.photoCards !== undefined && got.photoCards !== expectedCards) problems.push(`${got.photoCards} photo cards, expected ${expectedCards}`);
      if (got.othersFolded === false) problems.push("other events not folded");
      if (got.showsExactReason === false) problems.push("reason missing");
      rows.push({ size: size.name, ending, events, ...got, centred, problems });
    }
  }
}

await context.close();
await browser.close();

for (const row of rows) {
  console.log(`${row.problems.length ? "[FAIL]" : "[PASS]"} ${row.size} ${row.ending} ${row.events} events: "${row.heading}" gaps ${row.topGap}/${row.bottomGap}, ${row.photoCards ?? 0} photo cards, smallest text ${row.smallestTextPx}px${row.problems.length ? ` :: ${row.problems.join(", ")}` : ""}`);
}
if (rows.some((row) => row.problems.length)) process.exitCode = 1;
