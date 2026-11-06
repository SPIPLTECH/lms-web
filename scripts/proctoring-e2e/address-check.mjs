/**
 * The exam page's address in real Chrome: reached the way a student reaches it, from the course,
 * with no ids showing at any point, and everything that depends on the address still working.
 *
 *   node scripts/proctoring-e2e/address-check.mjs
 */
import { dismissStudentTour, launch, newStudentPage, seed, signIn, sleep, startExam, WEB } from "./lib.mjs";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
};

const fixture = seed(["address", "oldlink"], 3);
const ID = /[0-9a-f]{8}-[0-9a-f]{4}-|\bc[a-z0-9]{20,}\b/i;
const browser = await launch({ headed: false });
const { context, page } = await newStudentPage(browser);
const addresses = [];
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) addresses.push(frame.url());
});
let examHeader = null;
page.on("response", (response) => {
  if (response.request().isNavigationRequest() && response.url().includes("/student/proctored/")) examHeader = response.headers()["permissions-policy"] ?? null;
});

await signIn(page, fixture.students.address);
await page.goto(`${WEB}/student/learn/${fixture.courseId}`, { waitUntil: "domcontentloaded", timeout: 120000 });
const open = page.getByRole("button", { name: "Open exam" });
await open.waitFor({ timeout: 60000 });
await dismissStudentTour(page);
const learnAddress = new URL(page.url()).pathname;
await sleep(500);
const fromLearn = addresses.length;
await open.click();
await page.waitForURL(/\/student\/proctored\//, { timeout: 30000 });
await page.getByRole("checkbox", { name: /I have read this notice/i }).waitFor({ timeout: 60000 });
const shown = new URL(page.url());
console.log(`[INFO] the course page's address: ${learnAddress}`);
console.log(`[INFO] the exam page's address: ${shown.pathname}${shown.search}`);
check("the address has no ids", !ID.test(page.url()), page.url());
check("and no query", shown.search === "");
check("no address on the way here showed an id", !addresses.slice(fromLearn).some((url) => ID.test(url)), addresses.slice(fromLearn).join(" "));
check("the exam page still gets camera permission", /camera=\(self\)/.test(examHeader || ""), examHeader);

await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("checkbox", { name: /I have read this notice/i }).waitFor({ timeout: 60000 });
check("a refresh returns to the same exam, at the same address", new URL(page.url()).pathname === shown.pathname);

await page.getByRole("checkbox", { name: /I have read this notice/i }).check();
await page.getByRole("button", { name: "Agree and continue" }).click();
await page.getByRole("button", { name: /Turn on camera (&|and) mic/i }).click({ timeout: 30000 });
await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
const retake = page.getByRole("button", { name: "Retake photo" });
for (let tries = 0; tries < 6; tries += 1) {
  await page.getByRole("button", { name: "Take photo", exact: true }).click({ timeout: 30000 });
  if (await retake.waitFor({ timeout: 10000 }).then(() => true, () => false)) break;
  await sleep(1500);
}
await startExam(page);
check("the camera works and the exam starts at the clean address", new URL(page.url()).pathname === shown.pathname && !ID.test(page.url()));

await page.getByRole("button", { name: /The right one/ }).first().click();
await sleep(1500);
page.once("dialog", (dialog) => dialog.accept());
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText(/Question 1|Answered/).first().waitFor({ timeout: 60000 });
check("a refresh during the exam returns to it", new URL(page.url()).pathname === shown.pathname);
await sleep(1000);
await page.getByRole("button", { name: /Return to fullscreen/ }).click({ timeout: 5000 }).catch(() => {});

// Another tab has no exam to go with this address, and goes to the course instead of breaking.
const other = await context.newPage();
await other.goto(`${WEB}${shown.pathname}`, { waitUntil: "domcontentloaded" });
await other.waitForURL(/\/student\/learn\//, { timeout: 30000 }).then(() => check("the address pasted into a new tab goes to the course", true), () => check("the address pasted into a new tab goes to the course", false, other.url()));
await other.close();

// Finishing still goes back to the course.
await sleep(800);
for (let index = 1; index <= 3; index += 1) {
  await page.getByRole("button", { name: new RegExp(`^Question ${index},`) }).click({ timeout: 5000 });
  await page.getByRole("button", { name: /The right one/ }).first().click();
}
await sleep(800);
await page.getByRole("button", { name: /^Submit/ }).first().click();
await sleep(500);
await page.locator(".fixed.inset-0.z-50").getByRole("button").last().click({ timeout: 5000 });
await page.locator("h1").filter({ hasText: /Exam passed|Exam completed/ }).waitFor({ timeout: 45000 });
check("the result shows at the same address", new URL(page.url()).pathname === shown.pathname);
await page.getByRole("button", { name: "Back to the course" }).click();
await page.waitForURL(/\/student\/learn\//, { timeout: 30000 });
check("leaving returns to the course", true, new URL(page.url()).pathname);
await context.close();

// An old link, as a notification or a bookmark might hold.
{
  const { context: oldContext, page: oldPage } = await newStudentPage(browser);
  await signIn(oldPage, fixture.students.oldlink);
  await oldPage.goto(`${WEB}/student/proctored/${fixture.quizzes.oldlink}?from=${encodeURIComponent(`/student/learn/some-course?item=${fixture.quizzes.oldlink}`)}`, { waitUntil: "domcontentloaded" });
  await oldPage.getByRole("checkbox", { name: /I have read this notice/i }).waitFor({ timeout: 60000 });
  await sleep(300);
  check("an old link with an id still opens, and its address is cleaned", new URL(oldPage.url()).pathname === "/student/proctored/some-course" && new URL(oldPage.url()).search === "", oldPage.url());
  await oldContext.close();
}

await browser.close();
console.log(failures ? `${failures} failed` : "All passed");
if (failures) process.exitCode = 1;
