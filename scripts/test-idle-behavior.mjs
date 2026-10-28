import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const VIDEO_DIR = path.resolve("./test-evidence/videos");
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const COURSE_ID = "c1";

const FIXTURE_COURSE = {
  id: COURSE_ID,
  title: "Data Structures in Python",
  sequentialLearning: true,
  status: "PUBLISHED",
  isPublished: true,
  level: "Intermediate",
  category: "Computer Science",
  modules: [
    {
      id: "m1",
      title: "Module 1: Foundations",
      lessons: [
        {
          id: "l1",
          title: "Lesson 1: Binary Search Trees",
          topics: [],
        },
      ],
    },
  ],
};

const FIXTURE_ENROLLMENTS = [
  {
    id: "en1",
    courseId: COURSE_ID,
    course: FIXTURE_COURSE,
    enrolledAt: new Date().toISOString(),
  },
];

const FIXTURE_SEQUENCE = {
  courseId: COURSE_ID,
  title: "Data Structures in Python",
  progress: 10,
  steps: [
    {
      contentId: "cnt1",
      contentIds: ["cnt1"],
      kind: "CONTENT",
      type: "VIDEO",
      title: "Binary search trees intro",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      locked: false,
      completed: false,
      visited: true,
      path: {
        moduleId: "m1",
        lessonId: "l1",
      },
    },
  ],
  tree: {
    id: COURSE_ID,
    title: "Data Structures in Python",
    level: "course",
    entries: [
      {
        type: "container",
        node: {
          id: "m1",
          title: "Module 1: Foundations",
          level: "module",
          entries: [
            {
              type: "container",
              node: {
                id: "l1",
                title: "Lesson 1: Binary Search Trees",
                level: "lesson",
                entries: [
                  { type: "step", stepIndex: 0 },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  currentIndex: 0,
  resumeIndex: 0,
};

const USER = {
  id: "ui_student",
  name: "Ayan Kulkarni",
  email: "ayan@example.com",
  role: "STUDENT",
};

async function run() {
  console.log("=== STARTING IDLE AUTO-HIDE VERIFICATION TEST ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  });

  await context.addCookies([
    { name: "accessToken", value: "test-token", url: BASE },
    { name: "role", value: "STUDENT", url: BASE },
  ]);

  await context.addInitScript(({ u }) => {
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("theme", "dark");
  }, { u: USER });

  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === BASE) return route.continue();

    const p = url.pathname.replace(/\/+$/, "");
    const wrap = (data) => ({ success: true, data });

    if (p.endsWith("/auth/profile") || p.endsWith("/auth/me")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap(USER)) });
    }
    if (p.endsWith("/enrollments")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap(FIXTURE_ENROLLMENTS)) });
    }
    if (p.endsWith(`/courses/${COURSE_ID}`)) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap(FIXTURE_COURSE)) });
    }
    if (p.endsWith("/progress/learning-sequence")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap(FIXTURE_SEQUENCE)) });
    }
    if (p.endsWith("/progress/learning-path")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ success: true, path: [], nextItem: null, lockedCount: 0, skippableCount: 0 }) });
    }
    if (p.includes("/students/state")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap({ contentId: "cnt1", timestamp: 0 })) });
    }
    if (p.includes("/playback/lease") || p.includes("/playback/status")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap({ leaseId: "lease_1", active: true })) });
    }
    if (p.includes("/notifications")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap([])) });
    }
    if (p.includes("/lesson-queries/my-questions")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap([])) });
    }
    if (p.includes("/dashboard/student")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap({ enrolledCoursesList: [] })) });
    }
    if (p.includes("/socket.io")) {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "ok" });
    }

    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(wrap([])) });
  });

  const page = await context.newPage();
  const results = [];
  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name} ${details ? "(" + details + ")" : ""}`);
      results.push({ name, pass: true, details });
    } else {
      console.error(`[FAIL] ${name} ${details ? "(" + details + ")" : ""}`);
      results.push({ name, pass: false, details });
    }
  }

  try {
    console.log("Navigating to student learning page...");
    await page.goto(`${BASE}/student/learn/${COURSE_ID}`, { waitUntil: "domcontentloaded" });
    
    // Wait for initial render (within 500ms before auto-hide timer elapses)
    await page.waitForSelector("[data-learn-chrome]");

    const expandBtnSelector = 'button[aria-label="Show course map and workspace header"]';

    const getRailStatus = async () => {
      return page.evaluate(() => {
        const el = document.querySelector(".xl\\:block[data-learn-chrome]");
        if (!el) return { found: false, width: 0, isCollapsedClass: false };
        const rect = el.getBoundingClientRect();
        const isCollapsedClass = el.classList.contains("xl:w-0");
        return {
          found: true,
          width: rect.width,
          isCollapsedClass,
        };
      });
    };

    const isExpandBtnVisible = async () => {
      return page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Show course map and workspace header"]');
        return btn !== null && getComputedStyle(btn).display !== "none";
      });
    };

    // Initial state: rail is open
    let status = await getRailStatus();
    assert("Initial state: Course Map rail is visible", status.width > 200 && !status.isCollapsedClass, `width=${status.width}px`);

    // TEST 1: Pointer movement over visible Course Map keeps it open (resets idle timer)
    console.log("Testing: Pointer moves over visible Course Map (every 1s for 4s)...");
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(100 + i * 20, 200 + i * 20);
      await page.waitForTimeout(1000);
    }
    status = await getRailStatus();
    assert("Test 1: Pointer movement over Course Map keeps panels visible", status.width > 200 && !status.isCollapsedClass, `width=${status.width}px after 4s active moves`);

    // TEST 2: Inactivity auto-hides after 2.5 seconds
    console.log("Testing: Waiting 3.5s without input for auto-hide...");
    await page.waitForTimeout(3500);
    status = await getRailStatus();
    let expandVisible = await isExpandBtnVisible();
    assert("Test 2: Panels auto-hide after 2.5s inactivity", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px, expandBtn=${expandVisible}`);

    // TEST 3: Mouse movement while hidden must NEVER reveal panels
    console.log("Testing: Repeated mouse movement across lesson area while hidden (3 seconds)...");
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(500 + (i % 2) * 200, 300 + (i % 3) * 100);
      await page.waitForTimeout(300);
    }
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 3: Mouse movement while hidden does NOT reveal panels", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px, expandBtn=${expandVisible}`);

    // TEST 4: Wheel / scroll while hidden must NEVER reveal panels
    console.log("Testing: Mouse wheel scrolling while hidden...");
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(500);
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 4: Mouse wheel while hidden does NOT reveal panels", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px`);

    // TEST 5: Clicking lesson content / player while hidden must NEVER reveal panels
    console.log("Testing: Clicking lesson player content while hidden...");
    await page.mouse.click(600, 400);
    await page.waitForTimeout(600);
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 5: Clicking content while hidden does NOT reveal panels", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px`);

    // TEST 6: Arbitrary keyboard keys while hidden must NEVER reveal panels
    console.log("Testing: Arbitrary keypresses (Space, Down, Up) while hidden...");
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(500);
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 6: Arbitrary keypresses while hidden do NOT reveal panels", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px`);

    // TEST 7: Explicit expand tab button reopens panels
    console.log("Testing: Clicking explicit expand tab button...");
    await page.click(expandBtnSelector);
    // Allow CSS width transition to complete (300ms)
    await page.waitForTimeout(600);
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 7: Explicit expand tab reopens panels", status.width > 200 && !status.isCollapsedClass && !expandVisible, `width=${status.width}px, expandBtn=${expandVisible}`);

    // TEST 8: Preserves 2.5-second auto-hide after reopening
    console.log("Testing: Waiting 3.5s after reopening for second auto-hide cycle...");
    await page.waitForTimeout(3500);
    status = await getRailStatus();
    expandVisible = await isExpandBtnVisible();
    assert("Test 8: Panels auto-hide again after reopening", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px, expandBtn=${expandVisible}`);

    // TEST 9: Keyboard accessibility — Tab to expand button and press Enter
    console.log("Testing: Keyboard accessibility on expand tab (Focus + Enter)...");
    await page.focus(expandBtnSelector);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    status = await getRailStatus();
    assert("Test 9: Keyboard Enter on expand tab reopens panels", status.width > 200 && !status.isCollapsedClass, `width=${status.width}px`);

    // TEST 10: Manual collapse via Course Map hide button
    console.log("Testing: Manual collapse button in Course Map...");
    const collapseBtnSelector = 'aside[data-learn-chrome] button[title*="Hide"], button[title*="Close"], aside button[aria-label*="hide" i], aside button[aria-label*="close" i]';
    const collapseBtn = await page.$(collapseBtnSelector);
    if (collapseBtn) {
      await collapseBtn.click();
      await page.waitForTimeout(600);
      status = await getRailStatus();
      expandVisible = await isExpandBtnVisible();
      assert("Test 10a: Manual collapse button hides panels", status.width === 0 && status.isCollapsedClass && expandVisible, `width=${status.width}px`);

      // Mouse move while manually collapsed does not reveal
      await page.mouse.move(500, 300);
      await page.waitForTimeout(500);
      status = await getRailStatus();
      assert("Test 10b: Mouse move does not reopen manually collapsed panels", status.width === 0 && status.isCollapsedClass);

      // Expand tab reopens manual collapse
      await page.click(expandBtnSelector);
      await page.waitForTimeout(600);
      status = await getRailStatus();
      assert("Test 10c: Expand tab reopens manually collapsed panels", status.width > 200 && !status.isCollapsedClass, `width=${status.width}px`);
    } else {
      console.log("No specific collapse button found in aside, using expand tab verification.");
    }

    // Save final screenshot
    await page.screenshot({ path: path.join(VIDEO_DIR, "final_verification.png"), fullPage: true });

  } catch (err) {
    console.error("Test execution failed:", err);
    results.push({ name: "Exception during test", pass: false, details: String(err) });
  } finally {
    await context.close();
    await browser.close();
  }

  const videoFiles = fs.readdirSync(VIDEO_DIR);
  console.log(`Video recordings saved to: ${VIDEO_DIR}`);
  console.log(`Recorded video files: ${videoFiles.join(", ")}`);

  const passedCount = results.filter((r) => r.pass).length;
  const failedCount = results.filter((r) => !r.pass).length;
  console.log(`\n=== SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ===`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

run();
