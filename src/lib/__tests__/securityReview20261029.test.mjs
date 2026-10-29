import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sanitizeAiPreviewHtml } from "../sanitizeAiPreviewHtml.js";

// 1. Finding #11: DOMPurify strips active XSS vectors in AI Composer HTML previews
const malicious = `
  <p>Safe intro</p>
  <img src="x" onerror="alert('xss')" />
  <script>window.__pwned = true;</script>
  <svg onload="alert(2)"><circle cx="10" cy="10" r="5" /></svg>
  <a href="javascript:alert(3)" onclick="evil()">Click me</a>
  <iframe src="https://evil.example"></iframe>
  <div style="position:fixed;inset:0;z-index:99999">Overlay</div>
`;

const clean = sanitizeAiPreviewHtml(malicious);
assert.ok(clean.includes("<p>Safe intro</p>"), "preserves safe HTML paragraphs");
assert.ok(!clean.includes("<script"), "strips <script>");
assert.ok(!clean.includes("onerror"), "strips onerror handler");
assert.ok(!clean.includes("onload"), "strips onload handler");
assert.ok(!clean.includes("onclick"), "strips onclick handler");
assert.ok(!clean.includes("javascript:"), "strips javascript: URI");
assert.ok(!clean.includes("<iframe"), "strips <iframe>");
assert.ok(!clean.includes("<svg"), "strips <svg>");
assert.ok(!clean.includes("style="), "strips inline style overlay");

// 2. Finding #5: next.config.ts defines Content-Security-Policy with explicit script-src
const nextConfigSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../../next.config.ts"),
  "utf8"
);
assert.match(nextConfigSource, /Content-Security-Policy/);
assert.match(nextConfigSource, /script-src 'self'/);
assert.match(nextConfigSource, /object-src 'none'/);

// 3. Finding #4 (UI): CourseOverviewView restricts Publish/Unpublish/Restore to ADMIN
const overviewSource = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../components/instructor/courses/CourseOverviewView.jsx"),
  "utf8"
);
assert.doesNotMatch(overviewSource, /role === "INSTRUCTOR" && isDraft && onPublishClick/);
assert.doesNotMatch(overviewSource, /role === "INSTRUCTOR" && isPublished && onUnpublishClick/);
assert.match(overviewSource, /role === "ADMIN" && isDraft && onPublishClick/);
assert.match(overviewSource, /role === "ADMIN" && isPublished && onUnpublishClick/);

console.log("PASS: frontend security review checks (DOMPurify, CSP script-src, ADMIN publish UI)");
