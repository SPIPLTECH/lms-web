"""
Test catalogue for COMPONENT_TESTING_TRACKER.xlsx.

Everything here is a *definition*. Results come only from execution:
  - unit tests       -> sync_tracker.py runs every src/**/__tests__/*.test.js
  - CODE_CHECKS      -> sync_tracker.py runs each check against the working tree
  - HTTP_CHECKS      -> sync_tracker.py sends the request (with --http)
  - MANUAL_CASES     -> results are recorded by a person (or an agent driving a
                        real browser) in manual-results.json, then synced.

IDs are stable: never renumber or reuse an ID. Retire a case by setting
"retired": True instead of deleting it, so its history stays in the workbook.
Each case names its component by file path; the sync script resolves that to
the Component ID in the inventory.
"""

import json
import os
import re
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


# --------------------------------------------------------------------------
# helpers for code-level checks
# --------------------------------------------------------------------------

def _read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


def _exists(rel):
    return os.path.exists(os.path.join(ROOT, rel))


def _walk(rel_dirs, exts=(".js", ".jsx", ".ts", ".tsx"), skip=("__tests__",)):
    for rel_dir in rel_dirs:
        base = os.path.join(ROOT, rel_dir)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in skip]
            for name in sorted(filenames):
                if name.endswith(exts) and not name.endswith(".d.ts"):
                    full = os.path.join(dirpath, name)
                    yield os.path.relpath(full, ROOT).replace(os.sep, "/")


def _grep(rel_dirs, pattern, flags=0, exclude=()):
    """Return [(file, line_no, line)] for every match."""
    rx = re.compile(pattern, flags)
    hits = []
    for rel in _walk(rel_dirs):
        if any(rel.startswith(e) for e in exclude):
            continue
        for i, line in enumerate(_read(rel).splitlines(), 1):
            if rx.search(line):
                hits.append((rel, i, line.strip()))
    return hits


def _fmt_hits(hits, limit=12):
    out = [f"{f}:{n}  {t[:110]}" for f, n, t in hits[:limit]]
    if len(hits) > limit:
        out.append(f"... +{len(hits) - limit} more")
    return "\n".join(out)


# Default import of axios, or any import of the shared instance.
_AXIOS_IMPORT = r"""^\s*import\s+(?!\{|type\s)[\w$]+.*from\s+["'](axios|@/lib/axios)["']|^\s*import\s+.*from\s+["']@/lib/axios["']"""


def check_no_http_in_pages_components():
    hits = _grep(["src/app", "src/components"], _AXIOS_IMPORT, exclude=("src/app/api/",))
    if hits:
        return ("FAIL", f"{len(hits)} page/component file(s) import an HTTP client directly.",
                _fmt_hits(hits))
    return ("PASS", "No page or component imports axios or @/lib/axios.", "grep: 0 matches in src/app (excl. app/api) and src/components")


def check_no_http_in_hooks_features():
    hits = _grep(["src/hooks", "src/context", "src/features", "src/providers"], _AXIOS_IMPORT)
    if hits:
        return ("FAIL", f"{len(hits)} hook/context/feature file(s) import an HTTP client instead of a src/services module.",
                _fmt_hits(hits))
    return ("PASS", "Hooks, contexts, providers and features reach the API only through src/services.", "grep: 0 matches")


def check_no_hardcoded_price():
    hits = _grep(["src"], r"₹\s?\d|4,999|\b4999\b",
                 exclude=("src/app/zz-slider-check/", "src/app/qa-course-preview/"))
    if hits:
        return ("FAIL", f"{len(hits)} hardcoded price literal(s) in production source.", _fmt_hits(hits))
    return ("PASS", "No hardcoded ₹ amount or 4,999 fallback in production source (dev harness routes excluded; see TC-CL-014).",
            "grep '₹\\s?\\d|4,999|\\b4999\\b' over src/: 0 matches outside temporary harness routes")


def check_course_details_pricing_gate():
    rel = "src/app/courses/[courseId]/page.jsx"
    src = _read(rel)
    gate = re.search(r"Boolean\(store\)\s*&&\s*\(store\.isFree\s*\|\|\s*Number\(store\.price\)\s*>\s*0\)", src)
    label = "Pricing unavailable" in src
    if gate and label:
        line = src[: gate.start()].count("\n") + 1
        return ("PASS", "Purchasability = Store exists AND (isFree OR price > 0); otherwise label 'Pricing unavailable'.",
                f"{rel}:{line} isPurchasable gate present; 'Pricing unavailable' literal present")
    return ("FAIL", f"gate found={bool(gate)}, 'Pricing unavailable' label found={label}", rel)


def check_price_consumers_gate_on_is_priced():
    consumers = [f for f, _, _ in _grep(["src"], r"getPriceInfo\s*\(") if f != "src/lib/pricing.js"]
    consumers = sorted(set(consumers))
    missing = [f for f in consumers if not re.search(r"\bisPriced\b", _read(f))]
    probe = ""
    try:
        url = "file:///" + os.path.join(ROOT, "src", "lib", "pricing.js").replace(os.sep, "/")
        res = subprocess.run(
            ["node", "--input-type=module", "-e",
             f"import {{ getPriceInfo }} from '{url}'; console.log(JSON.stringify(getPriceInfo(null)))"],
            capture_output=True, text=True, timeout=60)
        probe = f"node probe getPriceInfo(null) => {res.stdout.strip() or res.stderr.strip()[:200]}"
    except Exception as exc:  # node missing etc.
        probe = f"node probe failed: {exc}"
    if missing:
        return ("FAIL",
                f"{len(missing)} of {len(consumers)} getPriceInfo() consumers never read isPriced, so a course with no Store renders as FREE.",
                "Consumers without isPriced:\n" + "\n".join(missing) + "\n" + probe)
    return ("PASS", f"All {len(consumers)} getPriceInfo() consumers gate on isPriced.", probe)


def check_instructor_has_no_publish_controls():
    hits = _grep(["src/components/instructor", "src/app/instructor"],
                 r"""role\s*===\s*["']INSTRUCTOR["'].*on(Publish|Unpublish|Archive)Click|on(Publish|Unpublish)Click=\{""")
    if hits:
        return ("FAIL", "Instructor course UI still wires Publish/Unpublish controls.", _fmt_hits(hits))
    return ("PASS", "No Publish/Unpublish control is rendered for or wired by instructor UI.", "grep: 0 matches")


def check_instructor_has_no_pricing_controls():
    hits = _grep(["src/app/instructor", "src/components/instructor"], r"\b(discount\w*|price\w*|isFree)\b", re.I)
    if hits:
        return ("FAIL", f"{len(hits)} pricing reference(s) in instructor UI.", _fmt_hits(hits))
    return ("PASS", "No price/discount/isFree field or reference anywhere in instructor pages/components.",
            "grep -i '\\b(discount*|price*|isFree)\\b' over src/app/instructor, src/components/instructor: 0 matches")


def check_admin_store_pricing_ui():
    rel = "src/app/admin/courses/[courseId]/page.jsx"
    page_hits = re.findall(r"\b(price|discountPrice|isFree|store)\b", _read(rel), re.I)
    svc_hits = _grep(["src/services"], r"""["'`][^"'`]*/(store|pricing)[^"'`]*["'`]""")
    svc_hits = [h for h in svc_hits if "api." in h[2] and not h[2].strip().startswith("//")]
    if page_hits and svc_hits:
        return ("PASS", "Admin course page references Store pricing and a pricing service exists.", _fmt_hits(svc_hits))
    return ("FAIL",
            f"No Store pricing UI: {len(page_hits)} price/store references in {rel}; {len(svc_hits)} service call(s) to a store/pricing endpoint.",
            f"{rel}: no price/discount/isFree/store reference\nsrc/services: no /store or /pricing endpoint wrapper")


def check_recommendations_view_course():
    rec_files = [f for f in _walk(["src/components", "src/features"]) if "ecommend" in f]
    bad = [f for f in rec_files if re.search(r"useRazorpayCheckout|startCheckout|Razorpay", _read(f))]
    card = "src/components/dashboard/RecommendedCourseCard.jsx"
    has_view = _exists(card) and re.search(r">\s*View Course\s*<|View Course", _read(card), re.I)
    if bad or not has_view:
        return ("FAIL", f"checkout in recommendation files: {bad}; 'View Course' on card: {bool(has_view)}", "\n".join(rec_files))
    return ("PASS", f"{len(rec_files)} recommendation file(s) never import checkout; card CTA is 'View Course' linking to the course page.",
            "Scanned:\n" + "\n".join(rec_files))


def check_order_payload_course_id_only():
    rel = "src/services/payment.service.js"
    m = re.search(r"""api\.post\(\s*["']/payments/orders["']\s*,\s*\{([^}]*)\}""", _read(rel))
    if m and [k.strip() for k in m.group(1).split(",") if k.strip()] == ["courseId"]:
        return ("PASS", "POST /payments/orders body is { courseId } only.", f"{rel}: api.post(\"/payments/orders\", {{{m.group(1).strip()}}})")
    return ("FAIL", f"Order payload is {{{m.group(1) if m else '?'}}}", rel)


def check_verify_payload_and_no_client_enrollment():
    rel = "src/hooks/useRazorpayCheckout.js"
    src = _read(rel)
    m = re.search(r"verifyMutation\.mutateAsync\(\{(.*?)\}\)", src, re.S)
    keys = [k.split(":")[0].strip() for k in (m.group(1).split(",") if m else []) if k.strip()]
    forbidden = [k for k in keys if k in ("amount", "price", "discountPrice", "userId")]
    enroll = re.findall(r"\b(createEnrollment|enrollCourse|useEnrollCourse|/enrollments)\b", src)
    if m and not forbidden and not enroll:
        return ("PASS", f"verify payload keys = {keys}; no client-side enrollment call.", f"{rel}: verifyMutation.mutateAsync({{{', '.join(keys)}}})")
    return ("FAIL", f"verify keys={keys}, forbidden={forbidden}, enrollment calls={enroll}", rel)


def check_middleware_guards():
    src = _read("src/middleware.js")
    ok = all(re.search(r'prefix:\s*"/%s",\s*role:\s*"%s"' % (p, r), src)
             for p, r in (("admin", "ADMIN"), ("instructor", "INSTRUCTOR"), ("student", "STUDENT")))
    ok = ok and "!token || role !== guard.role" in src and '"/admin/:path*"' in src
    return (("PASS", "Each portal prefix requires accessToken AND a matching role cookie; matcher covers all three.", "src/middleware.js roleGuards + config.matcher")
            if ok else ("FAIL", "Guard table or matcher differs from expectation.", "src/middleware.js"))


def check_documented_hierarchy_helpers_exist():
    wanted = ["src/lib/courseMapper.js", "src/lib/courseUnits.js", "src/lib/progressIndex.js",
              "src/lib/resumeTarget.js", "src/lib/__tests__/resumeTarget.test.js"]
    missing = [w for w in wanted if not _exists(w)]
    if missing:
        return ("FAIL", f"{len(missing)} of {len(wanted)} files named in CLAUDE.md 'Rules for hierarchy-aware code' do not exist.",
                "Missing:\n" + "\n".join(missing))
    return ("PASS", "All hierarchy helper files named in CLAUDE.md exist.", "\n".join(wanted))


def check_no_temporary_routes():
    hits = _grep(["src/app"], r"TEMPORARY .*(harness|QA route)|TEMPORARY verification")
    if hits:
        return ("FAIL", f"{len(hits)} route(s) self-described as TEMPORARY are still in src/app (and therefore shipped with every build).", _fmt_hits(hits))
    return ("PASS", "No temporary harness routes under src/app.", "grep: 0 matches")


def check_admin_course_page_loads_on_mount():
    rel = "src/app/admin/courses/[courseId]/page.jsx"
    src = _read(rel)
    effect = re.search(r"useEffect\(\s*\(\)\s*=>\s*\{[^}]*loadCourse\(", src, re.S)
    query = re.search(r"\buse\w*Course\w*\(\s*courseId", src)
    if effect or query:
        return ("PASS", "The page loads its course when it mounts.", f"{rel}: {'useEffect → loadCourse()' if effect else 'course query hook'} found")
    calls = [i for i, l in enumerate(src.splitlines(), 1) if "loadCourse()" in l]
    return ("FAIL", "Nothing loads the course on mount: loadCourse() runs only after a save/delete, and `loading` starts true, so the page shows the Loader forever.",
            f"{rel}: no useEffect/query hook; loadCourse() called only at lines {calls} (inside mutation handlers). Removed in commit bf1787c.")


def check_bare_api_fetches_send_device_key():
    """Every hand-built API request carrying a Bearer token also sends X-Device-Key."""
    offenders = []
    for rel in _walk(["src"]):
        if rel.startswith("src/app/api/"):
            continue
        text = _read(rel)
        if "Authorization: `Bearer ${token}`" in text and "X-Device-Key" not in text and rel != "src/lib/axios.js":
            # /api/upload is same-origin: the route reads the deviceKey cookie itself.
            if "fetch(\"/api/upload\"" in text:
                continue
            offenders.append(rel)
    axios = _read("src/lib/axios.js")
    if '"X-Device-Key"' not in axios:
        offenders.append("src/lib/axios.js (request interceptor)")
    if offenders:
        return ("FAIL", f"{len(offenders)} file(s) send a Bearer token without the device key.", "\n".join(offenders))
    return ("PASS", "axios and every bare API fetch send X-Device-Key with the Bearer token.",
            "grep: Bearer header files under src (excl. app/api) all reference X-Device-Key")


def check_blob_proxy_requires_session():
    src = _read("src/app/api/blob-proxy/route.js")
    problems = []
    if "resolveCaller" not in src or "/auth/profile" not in src:
        problems.append("no session check against the API")
    if "public, max-age" in src:
        problems.append("public caching header still present")
    if "private, no-store" not in src:
        problems.append("missing Cache-Control: private, no-store")
    if "isMediaType" not in src:
        problems.append("does not refuse video/audio to students")
    if problems:
        return ("FAIL", "blob-proxy: " + "; ".join(problems), "src/app/api/blob-proxy/route.js")
    return ("PASS", "blob-proxy requires a valid session, refuses student media, never caches publicly.",
            "src/app/api/blob-proxy/route.js: resolveCaller() -> GET /auth/profile; Cache-Control private, no-store")


def check_video_player_uses_playback_lease():
    src = _read("src/components/student/learning/VideoPlayer.jsx")
    ok = ("usePlaybackLease" in src and "mediaProtected" in src and "lease.media" in src
          and "PlaybackGate" in src)
    if not ok:
        return ("FAIL", "VideoPlayer does not gate protected videos on the playback lease.",
                "src/components/student/learning/VideoPlayer.jsx")
    return ("PASS", "Protected videos render only from the lease's media URL; conflicts show PlaybackGate.",
            "VideoPlayer.jsx: usePlaybackLease(content.id, { enabled: mediaProtected }); player only when lease.media")


def check_query_keys_constants():
    hits = _grep(["src/hooks", "src/app", "src/components", "src/features"], r"""queryKey:\s*\[\s*["'`]""")
    if hits:
        return ("FAIL", f"{len(hits)} inline string query key(s) instead of QUERY_KEYS constants.", _fmt_hits(hits))
    return ("PASS", "Every queryKey starts from a constant (no inline string literal as first element).", "grep: 0 matches")


# --------------------------------------------------------------------------
# CODE_CHECKS: executed on every sync (static analysis of the working tree)
# --------------------------------------------------------------------------

CODE_CHECKS = [
    dict(id="TC-CL-001", component="src/lib/axios.js", fn=check_no_http_in_pages_components,
         scenario="Service-layer rule: pages and components never import axios or the shared axios instance",
         expected="0 imports of axios (default) or @/lib/axios under src/app (excluding app/api route handlers) and src/components",
         ref="CLAUDE.md §5 API Service Layer"),
    dict(id="TC-CL-002", component="src/lib/axios.js", fn=check_no_http_in_hooks_features,
         scenario="Service-layer rule: hooks, contexts, providers and feature modules call the API only via src/services",
         expected="0 imports of axios / @/lib/axios under src/hooks, src/context, src/providers, src/features",
         ref="CLAUDE.md §5 (Component → Hook → Service → Axios)"),
    dict(id="TC-CL-003", component="src/app/courses/[courseId]/page.jsx", fn=check_no_hardcoded_price,
         scenario="No hardcoded course price or ₹4,999 fallback in production source",
         expected="0 matches of a ₹ amount literal / 4,999 / 4999 outside temporary harness routes",
         ref="CLAUDE.md §9 Pricing Rules"),
    dict(id="TC-CL-004", component="src/app/courses/[courseId]/page.jsx", fn=check_course_details_pricing_gate,
         scenario="Course details derives purchasability from the real Store and falls back to 'Pricing unavailable'",
         expected="isPurchasable = Boolean(store) && (store.isFree || Number(store.price) > 0); label 'Pricing unavailable' otherwise",
         ref="CLAUDE.md §9; src/app/courses/[courseId]/page.jsx"),
    dict(id="TC-CL-005", component="src/components/student/store/StoreCourseCard.jsx", fn=check_price_consumers_gate_on_is_priced,
         scenario="Every getPriceInfo() consumer gates on isPriced so a course with no Store is never shown as FREE",
         expected="All files calling getPriceInfo() read isPriced; missing Store => 'Pricing unavailable', no Enroll Free",
         ref="src/lib/pricing.js getPriceInfo (isFree is true when store is null; isPriced is false)"),
    dict(id="TC-CL-006", component="src/components/instructor/courses/CourseOverviewView.jsx", fn=check_instructor_has_no_publish_controls,
         scenario="RBAC: instructor course UI renders no Publish / Unpublish controls",
         expected="No role==='INSTRUCTOR' publish/unpublish button and no onPublishClick/onUnpublishClick wiring in instructor UI",
         ref="CLAUDE.md §8 INSTRUCTOR MUST NOT publish/unpublish"),
    dict(id="TC-CL-007", component="src/app/instructor/courses/edit/[courseId]/page.jsx", fn=check_instructor_has_no_pricing_controls,
         scenario="RBAC: instructor pages/components contain no price, discount or Store pricing controls",
         expected="0 price/discount/isFree references in src/app/instructor and src/components/instructor",
         ref="CLAUDE.md §8 INSTRUCTOR MUST NOT set prices"),
    dict(id="TC-CL-008", component="src/app/admin/courses/[courseId]/page.jsx", fn=check_admin_store_pricing_ui,
         scenario="Admin course detail provides Store pricing management (price, discount, free flag)",
         expected="Admin course page renders Store pricing controls backed by a service call to a store/pricing endpoint",
         ref="CLAUDE.md §8 ADMIN known gap: /admin/courses/[courseId] requires Store pricing UI"),
    dict(id="TC-CL-009", component="src/components/dashboard/RecommendedCourseCard.jsx", fn=check_recommendations_view_course,
         scenario="Recommendation cards navigate via VIEW COURSE and never launch Razorpay",
         expected="No recommendation component imports useRazorpayCheckout/Razorpay; card CTA is 'View Course'",
         ref="CLAUDE.md §10 Payment Rules"),
    dict(id="TC-CL-010", component="src/services/payment.service.js", fn=check_order_payload_course_id_only,
         scenario="Payment order request sends only the course identifier",
         expected="POST /payments/orders body is exactly { courseId } (no amount/price/discountPrice/userId)",
         ref="CLAUDE.md §10 Payment Rules"),
    dict(id="TC-CL-011", component="src/hooks/useRazorpayCheckout.js", fn=check_verify_payload_and_no_client_enrollment,
         scenario="Payment verify carries only courseId + Razorpay ids, and the client never creates an enrollment",
         expected="verify keys ⊆ {courseId, razorpayOrderId, razorpayPaymentId, razorpaySignature}; no enrollment API call in checkout hook",
         ref="CLAUDE.md §10 Payment Rules"),
    dict(id="TC-CL-012", component="src/middleware.js", fn=check_middleware_guards,
         scenario="Route guard table covers /admin, /instructor, /student with token + matching role",
         expected="roleGuards has all three prefixes; redirect when !token || role mismatch; matcher lists all three",
         ref="src/middleware.js"),
    dict(id="TC-CL-013", component="src/lib/courseMapper.js", fn=check_documented_hierarchy_helpers_exist,
         scenario="Hierarchy helpers and the order-consistency test named in CLAUDE.md exist",
         expected="courseMapper.js, courseUnits.js, progressIndex.js, resumeTarget.js and __tests__/resumeTarget.test.js all exist",
         ref="CLAUDE.md 'Rules for hierarchy-aware code'"),
    dict(id="TC-CL-014", component="src/app/zz-slider-check/page.jsx", fn=check_no_temporary_routes,
         scenario="Temporary verification/QA harness routes are removed from src/app",
         expected="No file under src/app describes itself as a TEMPORARY harness / QA route",
         ref="src/app/zz-slider-check/page.jsx, src/app/qa-course-preview/page.jsx header comments"),
    dict(id="TC-CL-015", component="src/constants/queryKeys.js", fn=check_query_keys_constants,
         scenario="Query keys come from QUERY_KEYS constants, not inline strings",
         expected="No queryKey whose first element is a string literal",
         ref="CLAUDE.md §7 Query Keys"),
    dict(id="TC-CL-016", component="src/app/admin/courses/[courseId]/page.jsx", fn=check_admin_course_page_loads_on_mount,
         scenario="Admin course detail page fetches its course when it opens",
         expected="A useEffect calls loadCourse() on mount (or a course query hook is used)",
         ref="src/app/admin/courses/[courseId]/page.jsx; regression from commit bf1787c"),
    dict(id="TC-CL-017", component="src/lib/axios.js", fn=check_bare_api_fetches_send_device_key,
         scenario="Device binding: every authenticated API request sends the server-issued device key",
         expected="axios interceptor and every bare fetch with a Bearer token add X-Device-Key",
         ref="Technical spec §4.3, §7.1; backend auth.middleware.js validateAccess"),
    dict(id="TC-CL-018", component="src/app/api/blob-proxy/route.js", fn=check_blob_proxy_requires_session,
         scenario="Private Blob proxy is not public: session required, no shared caching, no student media",
         expected="Session validated via GET /auth/profile; Cache-Control private, no-store; video/audio refused to students",
         ref="Technical spec §12; docs/EXISTING_ARCHITECTURE_AUDIT.md §5.2"),
    dict(id="TC-CL-019", component="src/components/student/learning/VideoPlayer.jsx", fn=check_video_player_uses_playback_lease,
         scenario="Student video plays only after the playback lease is held",
         expected="mediaProtected videos use usePlaybackLease; the player mounts only once lease.media exists",
         ref="Technical spec §8, §11 ('obtain the lease before requesting the media URL')"),
]


# --------------------------------------------------------------------------
# HTTP_CHECKS: executed with --http against the app under test and its API.
# Read-only or rejected-before-side-effect requests only.
#   target: "web" -> TRACKER_BASE_URL (default http://localhost:3000)
#           "api" -> TRACKER_API_URL  (default http://localhost:5000)
# --------------------------------------------------------------------------

_FAKE = "accessToken=qa-tracker-not-a-real-token"

HTTP_CHECKS = [
    dict(id="TC-API-001", component="src/middleware.js", target="web", method="GET", path="/admin/dashboard",
         scenario="Anonymous request to an ADMIN route is redirected to the landing page",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-002", component="src/middleware.js", target="web", method="GET", path="/instructor/courses",
         scenario="Anonymous request to an INSTRUCTOR route is redirected to the landing page",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-003", component="src/middleware.js", target="web", method="GET", path="/student/dashboard",
         scenario="Anonymous request to a STUDENT route is redirected to the landing page",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-004", component="src/middleware.js", target="web", method="GET", path="/instructor/courses",
         headers={"Cookie": _FAKE + "; role=STUDENT"},
         scenario="Wrong-role session (role=STUDENT) on an INSTRUCTOR route is redirected",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-005", component="src/middleware.js", target="web", method="GET", path="/admin/dashboard",
         headers={"Cookie": _FAKE},
         scenario="Token without a role cookie on an ADMIN route is redirected",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-006", component="src/middleware.js", target="web", method="GET", path="/instructor/courses",
         headers={"Cookie": "role=INSTRUCTOR"},
         scenario="Role cookie without an access token on an INSTRUCTOR route is redirected",
         expect_status=307, expect_location="/"),
    dict(id="TC-API-007", component="src/app/page.tsx", target="web", method="GET", path="/",
         scenario="Public landing page is served without authentication", expect_status=200),
    dict(id="TC-API-008", component="src/app/login/page.jsx", target="web", method="GET", path="/login",
         scenario="Login page is served without authentication", expect_status=200),
    dict(id="TC-API-009", component="src/app/register/page.jsx", target="web", method="GET", path="/register",
         scenario="Register page is served without authentication", expect_status=200),
    dict(id="TC-API-010", component="src/app/courses/page.jsx", target="web", method="GET", path="/courses",
         scenario="Public course catalogue is served without authentication", expect_status=200),
    dict(id="TC-API-011", component="src/app/courses/[courseId]/page.jsx", target="web", method="GET",
         path="/courses/qa-tracker-unknown-course",
         scenario="Unknown course id on the public course page returns 404 (not a crash or fake course)", expect_status=404),
    dict(id="TC-API-012", component="src/app/zz-slider-check/page.jsx", target="web", method="GET", path="/zz-slider-check",
         scenario="Temporary slider harness (fixture prices incl. 4999) is not publicly served", expect_status=404),
    dict(id="TC-API-013", component="src/app/qa-course-preview/page.jsx", target="web", method="GET", path="/qa-course-preview",
         scenario="Temporary QA route that bypasses the student auth guard is not publicly served", expect_status=404),
    dict(id="TC-API-014", component="src/services/auth.service.js", target="api", method="POST", path="/auth/login",
         json={"email": "qa-tracker-nonexistent@example.com", "password": "not-a-real-password"},
         scenario="Login with an unknown account is rejected with 401 'Invalid credentials'",
         expect_status=401, expect_body="Invalid credentials"),
    dict(id="TC-API-015", component="src/services/auth.service.js", target="api", method="POST", path="/auth/login",
         json={"email": "not-an-email", "password": "x"},
         scenario="Login with a malformed email is rejected with 400 validation error",
         expect_status=400, expect_body="valid email"),
    dict(id="TC-API-016", component="src/services/auth.service.js", target="api", method="POST", path="/auth/login",
         json={"email": "", "password": ""},
         scenario="Login with empty credentials is rejected with 400 validation error",
         expect_status=400, expect_body="not allowed to be empty"),
    dict(id="TC-API-017", component="src/services/course.service.js", target="api", method="GET", path="/courses/stats/mine",
         scenario="Instructor-only course stats endpoint rejects anonymous requests",
         expect_status=401, expect_body="Token required"),
    dict(id="TC-API-018", component="src/services/payment.service.js", target="api", method="POST", path="/payments/orders",
         json={},
         scenario="Payment order creation rejects anonymous requests (no order is created)",
         expect_status=401),
    dict(id="TC-API-019", component="src/services/course.service.js", target="api", method="GET",
         path="/courses?limit=200&status=PUBLISHED&sortBy=newest",
         scenario="Store catalogue contract: every published course carries a 'store' key the UI can price from",
         expect_status=200, expect_json="every_item_has_store_key"),
]


# --------------------------------------------------------------------------
# MANUAL_CASES: browser / manual scenarios. Status stays NOT RUN until a
# result is recorded in manual-results.json with real evidence.
# --------------------------------------------------------------------------

_RO = "Read-only on the shared deployment."
_SANDBOX = "Mutates data: run only against a disposable sandbox course/account, never shared data."
_ENV = "Local app http://localhost:3000 (API http://localhost:5000)"

MANUAL_CASES = [
    # ---- Authentication -------------------------------------------------
    dict(id="TC-UI-AUTH-001", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="Login form blocks submit with empty email/password",
         pre=f"{_ENV}; logged out.", steps="1. Open /login\n2. Leave both fields empty\n3. Click Sign in",
         expected="'Email is required.' and 'Password is required.' shown; no POST /auth/login sent",
         ref="src/app/login/page.jsx validate()"),
    dict(id="TC-UI-AUTH-002", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="Login form rejects a malformed email client-side",
         pre=f"{_ENV}; logged out.", steps="1. Open /login\n2. Enter 'abc' as email and any password\n3. Submit",
         expected="'Please enter a valid email address.' shown; no request sent", ref="src/app/login/page.jsx"),
    dict(id="TC-UI-AUTH-003", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="Wrong credentials show a generic error",
         pre=f"{_ENV}; logged out.", steps="1. Open /login\n2. Enter an unknown but well-formed email + password\n3. Submit",
         expected="Alert 'Invalid email or password.'; user stays on /login (API side covered by TC-API-014)",
         ref="src/app/login/page.jsx catch block"),
    dict(id="TC-UI-AUTH-004", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="INSTRUCTOR login lands on /instructor/courses and sets session cookies",
         pre=f"{_ENV}; valid INSTRUCTOR account.", steps="1. Open /login\n2. Sign in as instructor",
         expected="POST /auth/login 200; redirect to /instructor/courses; accessToken and role=INSTRUCTOR cookies present",
         ref="src/app/login/page.jsx role switch; src/lib/authCookies.js"),
    dict(id="TC-UI-AUTH-005", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="ADMIN login lands on /admin/dashboard",
         pre=f"{_ENV}; valid ADMIN account.", steps="1. Open /login\n2. Sign in as admin",
         expected="Redirect to /admin/dashboard; role=ADMIN cookie", ref="src/app/login/page.jsx"),
    dict(id="TC-UI-AUTH-006", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="STUDENT login lands on returnTo or /student/my-courses",
         pre=f"{_ENV}; valid STUDENT account.", steps="1. Open /login?returnTo=/student/store\n2. Sign in as student",
         expected="Redirect to /student/store (or /student/my-courses without returnTo)", ref="src/app/login/page.jsx"),
    dict(id="TC-UI-AUTH-007", component="src/app/verify-otp/page.jsx", type="UI – Browser",
         scenario="Unverified account login is routed to OTP verification",
         pre=f"{_ENV}; an unverified account.", steps="1. Sign in with an unverified account",
         expected="Redirect to /verify-otp?email=<email>", ref="src/app/login/page.jsx"),
    dict(id="TC-UI-AUTH-008", component="src/app/register/page.jsx", type="E2E",
         scenario="Registration with OTP verification creates a usable account",
         pre=f"{_ENV}. {_SANDBOX}", steps="1. Register\n2. Enter OTP from email\n3. Sign in",
         expected="Account verified; login succeeds", ref="src/app/register, src/app/verify-otp"),
    dict(id="TC-UI-AUTH-009", component="src/app/forgot-password/page.jsx", type="E2E",
         scenario="Forgot / reset password flow",
         pre=f"{_ENV}. Sends email. {_SANDBOX}", steps="1. /forgot-password\n2. Enter OTP from email → Verify OTP\n3. Set a new policy-compliant password\n4. Sign in",
         expected="Branded reset email received; new password works; old one rejected; reusing the previous password is refused",
         ref="src/app/forgot-password, src/app/reset-password; lms-api auth.service resetPassword"),
    dict(id="TC-UI-AUTH-010", component="src/middleware.js", type="UI – Browser",
         scenario="Logged-out browser opening a protected instructor URL is sent to the landing page",
         pre=f"{_ENV}; no session cookies.", steps="1. Open /instructor/courses/<courseId> in a fresh browser",
         expected="Browser ends on '/' (landing); no instructor content rendered", ref="src/middleware.js"),
    dict(id="TC-UI-AUTH-011", component="src/lib/axios.js", type="UI – Browser",
         scenario="Expired access token is refreshed transparently and the request retried",
         pre=f"{_ENV}; logged in; access token expired (wait for expiry or edit cookie).",
         steps="1. Expire accessToken\n2. Trigger any API call (navigate)",
         expected="POST /auth/refresh-token 200; original request retried; accessToken + role re-issued; no logout",
         ref="src/lib/axios.js response interceptor; unit: authCookies.test.js"),
    dict(id="TC-UI-AUTH-012", component="src/hooks/useAuth.js", type="UI – Browser",
         scenario="Logout clears the session and protected routes redirect again",
         pre=f"{_ENV}; logged in.", steps="1. Profile menu → Logout\n2. Open /instructor/courses",
         expected="Cookies cleared; redirected to '/'", ref="src/lib/authCookies.js clearSessionCookies"),
    dict(id="TC-UI-AUTH-013", component="src/app/reset-password/ResetPasswordContent.jsx", type="UI – Browser",
         scenario="Reset password is two-step: OTP first, then new password (checklist + policy + reuse error)",
         pre=f"{_ENV}. /auth/verify-reset-otp and /auth/reset-password may be mocked (no email, no DB write).",
         steps="1. Open /reset-password?email=<email>\n2. Type / paste the 6-digit code → Continue (try a wrong code first)\n3. Enter weak password, then mismatched confirmation\n4. Enter a valid password → Reset password",
         expected="'Step 1 of 2' progress + 6 segmented code boxes (typing, paste, Backspace work); wrong code outlines boxes red with a fix-it message; step 2 has labelled fields, 3-bar strength meter (Weak/Medium/Strong, no checklist), match indicator, 'Back to verification code'; success shows 'Password updated' with a Sign in button",
         ref="src/app/reset-password/ResetPasswordContent.jsx; src/lib/passwordPolicy.js"),
    dict(id="TC-UI-INS-020", component="src/app/instructor/courses/[courseId]/page.jsx", type="UI – Browser",
         scenario="Course Composer: gap under navbar; Course Map and course meta start at the same height; page itself does not scroll",
         pre=f"{_ENV}; logged in as INSTRUCTOR.", steps="1. Open /instructor/courses/<courseId>",
         expected="~20px between navbar and both panels; Course Map top == Course Overview card top (±1px border); document does not scroll",
         ref="instructor/courses/[courseId]/page.jsx root pt-3 sm:pt-5; notebook pt-0"),
    dict(id="TC-UI-INS-021", component="src/components/instructor/courses/ComposerNodeHeader.jsx", type="UI – Browser",
         scenario="Topic / SubTopic / Concept views show a header with an 'Edit … Details' button (like Module/Lesson)",
         pre=f"{_ENV}; logged in as INSTRUCTOR. Do not press Update — opening the form is read-only.",
         steps="1. Open a topic, a subtopic and a concept in the Composer\n2. Click Edit … Details on each\n3. Close without saving",
         expected="Header shows the level badge, parent name and title; the edit form opens prefilled with that record",
         ref="ComposerNodeHeader.jsx; EntityFormModal"),
    dict(id="TC-UI-INS-022", component="src/app/instructor/questions/upload/page.jsx", type="UI – Browser",
         scenario="Question Upload fits the screen: no page scroll, back button right under the navbar",
         pre=f"{_ENV}; logged in as INSTRUCTOR.", steps="1. Open /instructor/questions/upload at 1600×900 and 1366×768",
         expected="Document does not scroll; back button ~12px below navbar; content fits without inner scroll at both sizes",
         ref="instructor/layout.jsx isQuestionUploadPage shell; questions/upload/page.jsx"),
    dict(id="TC-UI-INS-023", component="src/components/instructor/LessonComposer/LessonComposerPanel.tsx", type="UI – Browser",
         scenario="Add Content opens on the first click from every entry point",
         pre=f"{_ENV}; logged in as INSTRUCTOR. Close the picker — do not create content.",
         steps="1. Course/Module/Lesson '+ Add Content'\n2. Course Map ⋯ → Add Content on module, lesson, topic, subtopic\n3. Add Above / Add Below on a block",
         expected="Picker 'Add New Content Cell' opens on the first click each time; picker chunk already loaded before the first click",
         ref="LessonComposerPanel.tsx loadAddCellModal preload; src/lib/autoOpenSignal.js"),
    dict(id="TC-UI-INS-024", component="src/components/instructor/courses/QuestionRepositoryPickerModal.jsx", type="UI – Browser",
         scenario="Quiz 'From Repository': questions ticked on several pages (or before a search) are all added",
         pre=f"{_ENV}; logged in as INSTRUCTOR; course repository with 2+ pages. Cancel the quiz afterwards — do not save.",
         steps="1. Lesson → Add Content → Quiz → From Repository\n2. Tick all on page 1, Next, tick 9 on page 2\n3. Add Selected while on page 2\n4. Reopen, tick 1, search, tick 1, Add Selected",
         expected="'Add Selected (19)' adds 19 questions; search case adds both; nothing ticked is dropped",
         ref="QuestionRepositoryPickerModal.jsx selected Map (was: items.filter on current page only)"),
    dict(id="TC-UI-AUTH-014", component="src/components/auth/PasswordRequirements.jsx", type="UI – Browser",
         scenario="Change Password (student desktop/mobile, instructor) enforces policy and refuses the current password",
         pre=f"{_ENV}; logged in. Submitting a valid change WRITES the password — needs approval.",
         steps="1. Profile → Change Password\n2. Enter a weak new password → Update\n3. Enter new = current → Update",
         expected="Checklist shown under New Password; weak password blocked with policy message; new = current blocked with 'must be different' message",
         ref="DesktopEditProfileView.jsx, MobileProfileView.jsx, InstructorProfileView.jsx; lib/passwordPolicy.js"),

    # ---- Public ------------------------------------------------------------
    dict(id="TC-UI-PUB-001", component="src/components/courses/FeaturedCourseCard.jsx", type="UI – Browser",
         scenario="Landing featured cards for courses without a Store show 'Pricing unavailable' and VIEW COURSE",
         pre=f"{_ENV}; logged out.", steps="1. Open /\n2. Inspect the featured course cards",
         expected="Unpriced course: 'Pricing unavailable' + 'VIEW COURSE'; no price, no Buy button",
         ref="src/components/courses/FeaturedCourseCard.jsx (isPriced)"),
    dict(id="TC-UI-PUB-002", component="src/app/courses/[courseId]/page.jsx", type="UI – Browser",
         scenario="Public course details with no Store shows 'Pricing unavailable' and no purchase action",
         pre=f"{_ENV}; logged out; course whose API store is null.", steps="1. Open /courses/<courseId>",
         expected="'Pricing unavailable'; no ₹ amount, no 4,999 fallback; no Buy/Enroll button",
         ref="src/app/courses/[courseId]/page.jsx priceLabel"),
    dict(id="TC-UI-PUB-003", component="src/app/courses/page.jsx", type="UI – Browser",
         scenario="Public catalogue lists published courses with search/filter",
         pre=f"{_ENV}; logged out.", steps="1. Open /courses\n2. Search by title",
         expected="Published courses listed; search narrows results; empty state when no match", ref="src/app/courses/page.jsx"),

    # ---- Instructor --------------------------------------------------------
    dict(id="TC-UI-INS-001", component="src/app/instructor/courses/page.jsx", type="UI – Browser",
         scenario="My Courses lists the instructor's courses with pagination",
         pre=f"{_ENV}; logged in as INSTRUCTOR. {_RO}", steps="1. Open /instructor/courses",
         expected="GET /courses?sortBy=recently_updated&page=1&limit=12 → 200; course cards with Edit / View Course; no console errors",
         ref="src/app/instructor/courses/page.jsx"),
    dict(id="TC-UI-INS-002", component="src/app/instructor/courses/page.jsx", type="UI – Browser",
         scenario="Course search filters My Courses and shows an empty state for no match",
         pre=f"{_ENV}; INSTRUCTOR. {_RO}", steps="1. Type a title fragment\n2. Type a nonsense string",
         expected="List narrows; nonsense shows empty state", ref="src/app/instructor/courses/page.jsx"),
    dict(id="TC-UI-INS-003", component="src/components/instructor/courses/CourseOverviewView.jsx", type="UI – Browser",
         scenario="RBAC: instructor course detail shows no Publish / Unpublish control",
         pre=f"{_ENV}; INSTRUCTOR; a DRAFT and a PUBLISHED course. {_RO} Do not click.",
         steps="1. Open /instructor/courses/<id> for a PUBLISHED course\n2. Inspect header actions\n3. Repeat for a DRAFT course",
         expected="No Publish or Unpublish button visible", ref="CLAUDE.md §8; code check TC-CL-006"),
    dict(id="TC-UI-INS-004", component="src/app/instructor/courses/edit/[courseId]/page.jsx", type="UI – Browser",
         scenario="RBAC: instructor course create/edit forms have no price or discount fields",
         pre=f"{_ENV}; INSTRUCTOR. {_RO} Do not save.",
         steps="1. Open /instructor/courses/edit/<id>\n2. Inspect every field and tab",
         expected="No price, discount, free-flag or Store pricing control", ref="code check TC-CL-007"),
    dict(id="TC-UI-INS-005", component="src/app/instructor/courses/[courseId]/composer/page.jsx", type="UI – Browser",
         scenario="Composer Course Map renders Module → Lesson → Topic rows (and lazy SubTopic/Concept)",
         pre=f"{_ENV}; INSTRUCTOR; course with modules. {_RO}", steps="1. Open composer\n2. Expand a Topic with SubTopics",
         expected="Rows in backend order; SubTopics/Concepts load on demand; no console errors",
         ref="CLAUDE.md hierarchy; useSubTopics/useConcepts"),
    dict(id="TC-UI-INS-006", component="src/app/instructor/courses/[courseId]/composer/page.jsx", type="UI – Browser",
         scenario="Composer restores ?subTopic= / ?concept= from the URL without an 'invalid' flash while loading",
         pre=f"{_ENV}; INSTRUCTOR; course with a Concept. {_RO}", steps="1. Open composer URL with ?subTopic=<id>&concept=<id>\n2. Hard reload",
         expected="Selection restored once lazy data arrives; never shown as invalid while loading",
         ref="CLAUDE.md 'must not treat still loading as invalid'"),
    dict(id="TC-UI-INS-007", component="src/components/instructor/courses/CourseComposerSidebar.jsx", type="E2E",
         scenario="Create, rename and delete Module / Lesson / Topic / SubTopic / Concept",
         pre=f"{_ENV}; INSTRUCTOR. {_SANDBOX}", steps="1. Add each level\n2. Rename\n3. Delete",
         expected="Each CRUD persists and the Course Map updates without reload", ref="useCreate*/useUpdate*/useDelete* hooks"),
    dict(id="TC-UI-INS-008", component="src/lib/reorderSiblings.js", type="E2E",
         scenario="Move Up / Move Down persists sibling order across content and containers",
         pre=f"{_ENV}; INSTRUCTOR. {_SANDBOX}", steps="1. Move a Topic up past Content\n2. Reload",
         expected="Order persists after reload (logic unit-tested in reorderSiblings.test.js)", ref="src/lib/reorderSiblings.js"),
    dict(id="TC-UI-INS-009", component="src/components/instructor/contents/ContentForm.jsx", type="E2E",
         scenario="Add content (PDF, DOCX, PPT, video, YouTube) at Course/Module/Lesson/Topic/SubTopic/Concept level",
         pre=f"{_ENV}; INSTRUCTOR. {_SANDBOX}", steps="1. Add each content type at each level",
         expected="Content saved with exactly one parent id (?<parentType>Id=); appears only at that level",
         ref="CLAUDE.md content parent types"),
    dict(id="TC-UI-INS-010", component="src/components/shared/DocxViewer.jsx", type="UI – Browser",
         scenario="Existing DOCX / PPT / PDF / video content renders in the instructor content viewer",
         pre=f"{_ENV}; INSTRUCTOR; course with documents. {_RO}", steps="1. Open each content item",
         expected="Document renders; failure shows the viewer's fallback state, not a blank page",
         ref="DocxViewer/PptViewer/PdfViewer; unit tests in src/lib/external"),
    dict(id="TC-UI-INS-011", component="src/app/instructor/quizzes/create/page.jsx", type="E2E",
         scenario="Create a quiz with questions at a chosen hierarchy level",
         pre=f"{_ENV}; INSTRUCTOR. {_SANDBOX}", steps="1. Create quiz\n2. Add MCQ_SINGLE / MCQ_MULTI questions",
         expected="Quiz appears only at its most specific parent level", ref="courseMapper getQuizPlacement"),
    dict(id="TC-UI-INS-012", component="src/app/instructor/courses/import/page.jsx", type="UI – Browser",
         scenario="Import drafts / AI composer expose Topic-only actions (no SubTopic/Concept actions)",
         pre=f"{_ENV}; INSTRUCTOR. {_RO} Do not import.", steps="1. Open /instructor/courses/import\n2. Inspect available actions",
         expected="No SubTopic or Concept action offered", ref="CLAUDE.md 'Import drafts and the AI composer are Topic-only'"),
    dict(id="TC-UI-INS-013", component="src/app/instructor/assignments/page.jsx", type="UI – Browser",
         scenario="Grading & Results page loads submissions with loading and empty states",
         pre=f"{_ENV}; INSTRUCTOR. {_RO}", steps="1. Open /instructor/assignments",
         expected="List or empty state; no console errors", ref="src/app/instructor/assignments/page.jsx"),

    # ---- Student -----------------------------------------------------------
    dict(id="TC-UI-STU-001", component="src/components/student/store/StoreCourseCard.jsx", type="UI – Browser",
         scenario="Student Store card for a course with no Store shows 'Pricing unavailable', not FREE / Enroll Free",
         pre=f"{_ENV}; STUDENT; published course with store=null (live data has 3).", steps="1. Open /student/store\n2. Inspect each card and its preview modal",
         expected="'Pricing unavailable'; no FREE badge; no Enroll Free button", ref="code check TC-CL-005"),
    dict(id="TC-UI-STU-002", component="src/app/courses/[courseId]/page.jsx", type="UI – Browser",
         scenario="Course with a valid Store shows the actual Store price and BUY COURSE",
         pre=f"{_ENV}; STUDENT; a course with store.price > 0 and isFree=false.", steps="1. Open the course details page",
         expected="Exact Store price (discountPrice when lower) and BUY COURSE", ref="CLAUDE.md §9"),
    dict(id="TC-UI-STU-003", component="src/components/student/course-details/CourseHeader.jsx", type="UI – Browser",
         scenario="Enrolled student sees CONTINUE LEARNING instead of BUY",
         pre=f"{_ENV}; STUDENT enrolled in the course.", steps="1. Open the course details page",
         expected="CONTINUE LEARNING → /student/learn/<courseId>", ref="CLAUDE.md §9"),
    dict(id="TC-UI-STU-004", component="src/hooks/useRazorpayCheckout.js", type="E2E",
         scenario="BUY COURSE → POST /payments/orders → Razorpay → POST /payments/verify → enrollment ACTIVE",
         pre=f"Razorpay TEST mode keys; STUDENT; priced course. {_SANDBOX} Excluded from shared-deployment runs.",
         steps="1. Click BUY COURSE\n2. Pay with a Razorpay test card\n3. Observe network",
         expected="Order body {courseId}; verify body {courseId, razorpay ids}; redirect to /student/learn/<id>; CONTINUE LEARNING afterwards",
         ref="CLAUDE.md §10; code checks TC-CL-010/011"),
    dict(id="TC-UI-STU-005", component="src/hooks/useRazorpayCheckout.js", type="E2E",
         scenario="Cancelled or failed Razorpay payment shows an error and does not enroll",
         pre=f"Razorpay TEST mode; STUDENT. {_SANDBOX}", steps="1. Open checkout\n2. Dismiss modal / use a failing test card",
         expected="State CANCELLED/FAILED with message; no enrollment; BUY COURSE still shown", ref="useRazorpayCheckout ondismiss / payment.failed"),
    dict(id="TC-UI-STU-006", component="src/components/dashboard/RecommendedCourseCard.jsx", type="UI – Browser",
         scenario="Recommendation cards show VIEW COURSE and open the course page (no checkout)",
         pre=f"{_ENV}; STUDENT with recommendations. {_RO}", steps="1. Open /student/dashboard\n2. Click VIEW COURSE on a recommendation",
         expected="Navigates to /student/courses/<id>; Razorpay never opens", ref="code check TC-CL-009"),
    dict(id="TC-UI-STU-007", component="src/app/student/learn/[courseId]/page.jsx", type="UI – Browser",
         scenario="Learning Player Prev/Next walks OLD, NEW and MIXED hierarchies in Course Map order",
         pre=f"{_ENV}; STUDENT enrolled in a course containing SubTopics/Concepts. {_RO}",
         steps="1. Open /student/learn/<id>\n2. Step through every unit with Next, then back with Prev",
         expected="Order matches Course Map; quizzes appear only at their most specific level",
         ref="courseMapper/progressIndex unit tests"),
    dict(id="TC-UI-STU-008", component="src/lib/progressIndex.js", type="UI – Browser",
         scenario="Completion gates block leaving a unit until its required items are complete",
         pre=f"{_ENV}; STUDENT enrolled. Marks progress (student-owned data only).",
         steps="1. Try Next before finishing items\n2. Complete items\n3. Try Next again",
         expected="Blocked first, allowed after completion", ref="progressIndex.test.js"),
    dict(id="TC-UI-STU-009", component="src/app/student/learn/[courseId]/page.jsx", type="UI – Browser",
         scenario="Resume returns the student to their last position",
         pre=f"{_ENV}; STUDENT with progress.", steps="1. Leave mid-course\n2. Re-open the course",
         expected="Opens at the last unit / video position", ref="videoPlayback resume unit tests"),
    dict(id="TC-UI-STU-015", component="src/app/student/learn/[courseId]/page.jsx", type="UI – Browser",
         scenario="Mobile Course Map sheet stays open while the student reads it; desktop idle-hide unchanged",
         pre=f"{_ENV}; enrolled STUDENT; viewport below 1280px (phone) and a desktop window (1280px+).",
         steps="1. Phone width: open the lesson, tap the hamburger, then do not touch the screen for 10 s\n2. Pick an item; also try ✕ and the backdrop\n3. Desktop: leave the mouse still for 3+ s, then move it",
         expected="1. The sheet stays open\n2. Each closes it\n3. Rail and workspace header hide after ~2.5 s and return on movement",
         ref="learn page IDLE LAYOUT effect (no setCourseMapOpen there)"),
    dict(id="TC-UI-STU-016", component="src/components/student/learning/LearnSidePanel.jsx", type="UI – Browser",
         scenario="Mobile Learning tools sheet: Ask instructor / Sticky notes as tabs in a bottom sheet",
         pre=f"{_ENV}; enrolled STUDENT; viewport below 1280px (phone). Read-only: do not send a question or add a note.",
         steps="1. Open a lesson, tap ··· next to the title\n2. Switch between the two tabs\n3. Close with ✕, then reopen and close by tapping the dark area, then by swiping the title bar down\n4. Desktop (1280px+): open the side panel",
         expected="1. A sheet slides up from the bottom (title bar and video header stay above it); tabs 'Ask instructor' | 'Sticky notes', one always selected, no ⌄ chevrons\n2. Content switches without the sheet changing height; long content scrolls inside the sheet\n3. Each closes it\n4. Desktop right column unchanged (two buttons with chevrons, collapsible)",
         ref="learn page LEARNING TOOLS SHEET; LearnSidePanel tabs"),
    dict(id="TC-UI-STU-017", component="src/app/student/learn/[courseId]/page.jsx", type="UI – Browser",
         scenario="Mobile video step: Mark as Complete above the player, frame fits the 16:9 video, Previous/Next right under it",
         pre=f"{_ENV}; enrolled STUDENT; viewport below 1280px (phone); a video step not yet completed. Read-only: do not press Mark as Complete.",
         steps="1. Open a video step\n2. Look at the space between the video's bottom edge and Previous/Next\n3. Open a document/text step and a completed step",
         expected="1. 'Mark as Complete' sits above the player (left), then the video\n2. No empty band inside the frame under the video; Previous/Next follow directly\n3. Document/text frames keep their height; a completed step shows no button and no extra gap. Desktop unchanged",
         ref="learn page FRAME_MODE_CLASSES (aspect) and COMPLETION (below xl)"),
    dict(id="TC-UI-STU-018", component="src/features/ai-assistant/components/AiAssistantButton.jsx", type="UI – Browser",
         scenario="Mobile learn page (360/390/430px): reference layout and the AI launcher fixed bottom-right, opening the existing assistant",
         pre=f"{_ENV}; STUDENT on a VIDEO step. May be run against API fixtures (Playwright route interception) — no backend writes.",
         steps="1. Open the video step at 360, 390 and 430px wide\n2. Measure layout; scroll; Tab to the launcher; tap it\n3. Repeat at 1440px",
         expected="No horizontal overflow; Mark as Complete above the 16:9 frame; Previous/Next 12px under it; launcher fixed bottom-right (20px + safe area), topmost, unmoved by scrolling, clear of video/Next/Previous, visible focus ring, tap opens the AI Assistant window. Desktop: launcher bottom-left on video steps, Mark as Complete top-right of the player (unchanged)",
         ref="learn page AiAssistantWidget side; AiAssistantButton"),
    dict(id="TC-UI-STU-019", component="src/components/student/learn/PdfViewer.jsx", type="UI – Browser",
         scenario="Mobile PDF document step is readable: pinch / −Fit+ zoom, page scrolls both ways, Previous/Next clear of the AI launcher",
         pre=f"{_ENV}; STUDENT; a DOCUMENT step with an A4 PDF; viewport below 1280px (touch). May be run against API fixtures.",
         steps="1. Open the PDF step at 360, 390 and 430px\n2. Tap Zoom in a few times, scroll sideways to both edges\n3. Tap Fit, then pinch the page with two fingers\n4. Check Previous/Next against the purple launcher\n5. Repeat at 1440px",
         expected="Zoom control (− Fit +) top-right of the page; zoom keeps the centre in view; the page's left edge is reachable when zoomed; pinch zooms the PDF, not the browser; Fit returns to full width. Previous/Next sit above the launcher. Desktop: no zoom control, page unchanged",
         ref="PdfViewer touchZoom; VideoPlayer isBelowXl; learn page bottom padding below xl"),
    dict(id="TC-UI-STU-010", component="src/app/student/attempt/[quizId]/page.jsx", type="E2E",
         scenario="Quiz attempt submit and result page",
         pre=f"{_ENV}; STUDENT enrolled; quiz available. Creates an attempt.", steps="1. Start quiz\n2. Answer\n3. Submit",
         expected="Result page with score and answer review", ref="questionType.test.js"),
    dict(id="TC-UI-STU-011", component="src/app/student/assignments/[assignmentId]/page.jsx", type="E2E",
         scenario="Assignment submission with file upload",
         pre=f"{_ENV}; STUDENT. {_SANDBOX}", steps="1. Open assignment\n2. Upload file\n3. Submit",
         expected="Submission recorded; status shown", ref="useSubmitAssignment"),
    dict(id="TC-UI-STU-012", component="src/components/student/learning/VideoPlayer.jsx", type="UI – Browser",
         scenario="Video player shows friendly errors for unavailable / embedding-disabled YouTube videos",
         pre=f"{_ENV}; STUDENT; course with such a video. {_RO}", steps="1. Play the video",
         expected="Message per error code (2 invalid, 100 unavailable, 101/150 embedding disabled)", ref="videoPlayback.test.js"),
    dict(id="TC-UI-STU-013", component="src/app/student/store/page.jsx", type="UI – Browser",
         scenario="Store page shows an error state when the catalogue request fails",
         pre="Local or deployed with the API blocked (e.g. browser request blocking).", steps="1. Block GET /courses\n2. Open /student/store",
         expected="Error state rendered (isError), no crash, no empty 'FREE' cards", ref="src/app/student/store/page.jsx isError"),
    dict(id="TC-UI-STU-014", component="src/app/student/my-courses/page.jsx", type="UI – Browser",
         scenario="My Courses uses the standard page layout like Instructor Courses: no inner scrolling course grid",
         pre=f"{_ENV}; STUDENT with enrolled courses. {_RO}", steps="1. Open /student/my-courses at desktop width\n2. Scroll the page",
         expected="Enrolled Courses grid has no own scrollbar; the whole page scrolls; pagination sits under the grid",
         ref="src/app/student/layout.jsx (no my-courses viewport shell); src/app/instructor/courses/page.jsx"),

    # ---- Admin -------------------------------------------------------------
    dict(id="TC-UI-ADM-001", component="src/app/admin/courses/[courseId]/page.jsx", type="UI – Browser",
         scenario="Admin sets list price, discount price and free flag for a course's Store",
         pre=f"{_ENV}; ADMIN. {_SANDBOX}", steps="1. Open /admin/courses/<id>\n2. Set price/discount\n3. Save",
         expected="Store saved; student course page shows the new price", ref="CLAUDE.md §8 known gap; code check TC-CL-008"),
    dict(id="TC-UI-ADM-002", component="src/app/admin/courses/page.jsx", type="E2E",
         scenario="Admin reviews, publishes, unpublishes and archives a course",
         pre=f"{_ENV}; ADMIN. {_SANDBOX}", steps="1. Publish a draft\n2. Unpublish\n3. Archive",
         expected="Status transitions persist; instructor cannot perform them", ref="CLAUDE.md §8 ADMIN"),
    dict(id="TC-UI-ADM-004", component="src/app/admin/courses/[courseId]/page.jsx", type="UI – Browser",
         scenario="Admin course detail page opens and shows the course",
         pre=f"{_ENV}; ADMIN; an existing course id. {_RO}", steps="1. Open /admin/courses/<courseId>\n2. Wait up to 30 s",
         expected="Course hero, stats and curriculum render; GET /courses/<id> is requested; no endless spinner",
         ref="code check TC-CL-016"),
    dict(id="TC-UI-ADM-003", component="src/app/admin/dashboard/page.jsx", type="UI – Browser",
         scenario="Admin dashboard loads metrics with loading/error states",
         pre=f"{_ENV}; ADMIN. {_RO}", steps="1. Open /admin/dashboard",
         expected="Metrics render; no console errors", ref="useDashboardHome"),

    # ---- Existing local tooling ---------------------------------------------
    dict(id="TC-UI-RESP-001", component="scripts/ui-smoke.mjs", type="UI – Browser", method="Manual – browser (local)",
         scenario="Responsive smoke: no horizontal overflow, tap targets ≥32px, no console errors (stubbed API)",
         pre="Local dev server (npm run dev) + `npx playwright install chromium`; API fully stubbed by the script.",
         steps="node scripts/ui-smoke.mjs INSTRUCTOR ./ui-shots /instructor/dashboard:home (repeat per role/route)",
         expected="Report shows no overflow, no small tap targets, no console errors at 390/768/1440 px",
         ref="scripts/ui-smoke.mjs"),

    # ---- Single session, device access, playback lease ------------------------
    # Prerequisite for all: backend migrated with scripts/add-auth-sessions-playback.sql.
    dict(id="TC-UI-SESS-001", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="Second device is refused while the first session is active",
         pre=f"{_ENV}; migrated DB; STUDENT signed in on browser A.",
         steps="1. In a second browser profile (B), open /login\n2. Sign in as the same STUDENT",
         expected="B shows 'This account is already signed in on another device. Sign out there before signing in here.'; B stays on /login; A keeps working",
         ref="Spec T-02; POST /auth/login 409 SESSION_ALREADY_ACTIVE"),
    dict(id="TC-UI-SESS-002", component="src/app/login/page.jsx", type="UI – Browser",
         scenario="After A logs out, B can sign in",
         pre=f"{_ENV}; migrated DB; TC-UI-SESS-001 state.", steps="1. Log out on A\n2. Sign in on B",
         expected="B reaches its dashboard; A's tabs are sent to /login on their next request", ref="Spec T-04"),
    dict(id="TC-UI-SESS-003", component="src/components/auth/GoogleSignInButton.jsx", type="UI – Browser",
         scenario="Google sign-in for a linked/matching account",
         pre=f"{_ENV}; migrated DB; GOOGLE_CLIENT_ID + NEXT_PUBLIC_GOOGLE_CLIENT_ID set; Google account whose verified email matches an LMS user.",
         steps="1. Open /login\n2. Click 'Sign in with Google' and complete the popup",
         expected="Signed in to the matching account's dashboard; an unmatched Google account shows 'No Orange Tree LMS account is linked to this Google account.'",
         ref="POST /auth/google"),
    dict(id="TC-UI-SESS-004", component="src/components/student/learning/VideoPlayer.jsx", type="UI – Browser",
         scenario="Protected video plays only after the lease; switching items keeps one lease",
         pre=f"{_ENV}; migrated DB; enrolled STUDENT; course with an uploaded (non-YouTube) video.",
         steps="1. Open the video step in /student/learn/<courseId>\n2. Watch the network tab\n3. Open another video step",
         expected="POST /playback/start precedes any /playback/media request; heartbeats every ~20 s; course/content responses carry no videoUrl",
         ref="Spec §8, §11, T-06"),
    dict(id="TC-UI-SESS-005", component="src/components/student/learning/VideoPlayer.jsx", type="UI – Browser",
         scenario="Lost lease pauses playback with a message",
         pre=f"{_ENV}; migrated DB; video playing.",
         steps="1. While playing, end the session as ADMIN from /admin/students/<id> (Active session → End session)",
         expected="Player pauses / user is sent to /login with 'Your session is no longer valid…'", ref="Spec T-12, T-16"),
    dict(id="TC-UI-SESS-006", component="src/components/admin/student/ActiveSessionCard.jsx", type="UI – Browser",
         scenario="Admin sees and ends a student's active session",
         pre=f"{_ENV}; migrated DB; ADMIN; student signed in elsewhere.",
         steps="1. Open /admin/students/<id>\n2. Click 'End session' and confirm",
         expected="Card shows device + sign-in time; after confirming it shows 'Not signed in on any device'; student can sign in on another device",
         ref="POST /admin/sessions/:id/revoke (audited)"),
    dict(id="TC-UI-SESS-007", component="src/components/student/learning/VideoPlayer.jsx", type="UI – Browser",
         scenario="A video left paused in a background tab does not show 'Playback permission expired'",
         pre=f"{_ENV}; migrated DB; enrolled STUDENT; course with an uploaded (non-YouTube) video.",
         steps="1. Open the video step, play a few seconds, pause\n2. Switch to another tab for 10+ minutes (Chrome throttles the hidden tab's timers)\n3. Return to the tab and press play",
         expected="No 'Playback permission expired' overlay; video resumes from the paused position. Network: a heartbeat on return, and if it was 409 PLAYBACK_LEASE_LOST, one POST /playback/start followed by a new /playback/media URL",
         ref="lib/playbackLease.js; playbackLease.test.js 'hidden tab'"),
    dict(id="TC-UI-SESS-008", component="src/components/student/learning/VideoPlayer.jsx", type="UI – Browser",
         scenario="Two tabs of the same browser on the same video: closing one does not interrupt the other",
         pre=f"{_ENV}; migrated DB; enrolled STUDENT; course with an uploaded (non-YouTube) video.",
         steps="1. Open the same video step in tab A and tab B\n2. Close tab B\n3. Keep watching in tab A for 1+ minute",
         expected="Tab A keeps playing or re-claims silently (POST /playback/start after a 409 heartbeat); no expired overlay. A second device still gets 'Playing on another device'",
         ref="lib/playbackLease.js; playbackLease.test.js 'two tabs'"),

    # ---- API performance (docs/API_PERFORMANCE_REPORT.md) ----------------------
    dict(id="TC-UI-PERF-001", component="src/app/student/learn/[courseId]/page.jsx", type="UI – Browser",
         scenario="Learn page API timings: no roll-up queueing, compressed sequence, Server-Timing on every response",
         pre=f"{_ENV}; enrolled STUDENT; course already opened once (so no first-open row creation). Read-only: opening a course updates lastAccessedAt, as in normal use.",
         steps="1. Open /student/learn/<courseId> with DevTools → Network\n2. Select learning-sequence, learning-path, start, status\n3. Check Timing → Server Timing and the response headers\n4. Compare with the [timing] lines in the backend terminal",
         expected="Every API response has Server-Timing (total/db/app); learning-sequence carries Content-Encoding br or gzip; app time of learning-sequence and start is small (no multi-second gap between total and db); status shows 1 query",
         ref="backend utils/requestTiming.js; progressRollup.js; playback.service.js getStatus"),
]


# --------------------------------------------------------------------------
# PURPOSE_OVERRIDES: hand-written Purpose for business-critical files whose
# header comment is missing or describes only one helper. Applied when the
# inventory row is created (or its Purpose cell is cleared).
# --------------------------------------------------------------------------

PURPOSE_OVERRIDES = {
    "src/middleware.js": "Edge route guard: /admin, /instructor and /student require an accessToken cookie AND a matching role cookie; otherwise 307 redirect to the landing page.",
    "src/lib/axios.js": "Shared axios instance: attaches the access token, refreshes it on 401 via /auth/refresh-token (re-issuing role), retries once, and sends protected pages to '/' when refresh fails.",
    "src/lib/authCookies.js": "Writes / clears the accessToken, refreshToken and role session cookies that middleware.js reads.",
    "src/lib/pricing.js": "getPriceInfo(store) → { isPriced, isFree, effectivePrice, listPrice, currency } and formatPrice(); isPriced is false when no Store row exists.",
    "src/hooks/useRazorpayCheckout.js": "Checkout flow: POST /payments/orders {courseId} → Razorpay modal → POST /payments/verify → redirect to /student/learn/<courseId>; tracks CANCELLED/FAILED states.",
    "src/app/courses/[courseId]/page.jsx": "Route /courses/[courseId]. Public course details: syllabus, reviews, instructor and Store-based price label ('Pricing unavailable' when no valid Store).",
    "src/app/instructor/courses/[courseId]/page.jsx": "Route /instructor/courses/[courseId]. Instructor course workspace: course overview header, Course Map editing of modules/lessons/topics/content/quizzes, AI apply and course import.",
    "src/app/admin/courses/[courseId]/page.jsx": "Route /admin/courses/[courseId]. Admin course review page (no Store pricing management yet — DEF-003).",
    "src/components/student/store/StoreCourseCard.jsx": "Student Store course card: price badge, Enroll Free for free courses, Buy → course details for paid ones.",
    "src/components/student/store/CoursePreviewModal.jsx": "Student Store preview modal: course summary with price badge and Enroll Free / Buy action.",
    "src/components/instructor/courses/CourseOverviewView.jsx": "Instructor course header/overview: stats, Save, Publish/Unpublish/Restore actions (publish actions violate RBAC — DEF-001).",
    "src/components/dashboard/RecommendedCourseCard.jsx": "Recommendation card with 'View Course' link to /student/courses/<id> (no checkout).",
    "src/components/courses/FeaturedCourseCard.jsx": "Landing/catalogue featured course card with Store price or 'Pricing unavailable' and VIEW COURSE.",
    "scripts/ui-smoke.mjs": "Playwright responsive smoke test against a stubbed API: reports horizontal overflow, small tap targets and console errors per viewport.",
}


# --------------------------------------------------------------------------
# SEED_DEFECTS: defects found while building the tracker. Added once (by ID);
# afterwards the workbook row is the record and is never overwritten here.
# --------------------------------------------------------------------------

SEED_DEFECTS = [
    dict(id="DEF-001", tc="TC-CL-006; TC-UI-INS-003", component="src/components/instructor/courses/CourseOverviewView.jsx",
         desc="Instructor course page still renders Publish (DRAFT) and Unpublish (PUBLISHED) buttons wired to publish/unpublish mutations.",
         steps="1. Sign in as INSTRUCTOR\n2. Open /instructor/courses/<id>\n3. Look at the course header actions",
         expected="No publish/unpublish control for instructors (CLAUDE.md §8).",
         actual="CourseOverviewView.jsx:111/121 renders Publish/Unpublish when role==='INSTRUCTOR'; page.jsx:2946-2947 passes the handlers (usePublishCourse/useUnpublishCourse).",
         severity="High", file="src/components/instructor/courses/CourseOverviewView.jsx; src/app/instructor/courses/[courseId]/page.jsx"),
    dict(id="DEF-002", tc="TC-CL-005; TC-UI-STU-001", component="src/components/student/store/StoreCourseCard.jsx",
         desc="Student Store card and preview modal show a course with no Store as FREE and offer 'Enroll Free'.",
         steps="1. Sign in as STUDENT\n2. Open /student/store (live API returns 3 published courses, all store=null on 2026-10-15)",
         expected="'Pricing unavailable' and no purchase/enroll action when Store is missing (CLAUDE.md §9).",
         actual="StoreCourseCard.jsx:16 and CoursePreviewModal.jsx:30 read getPriceInfo().isFree, which is true for store=null (node probe: {isPriced:false,isFree:true}); they never read isPriced.",
         severity="High", file="src/components/student/store/StoreCourseCard.jsx; src/components/student/store/CoursePreviewModal.jsx"),
    dict(id="DEF-003", tc="TC-CL-008; TC-UI-ADM-001", component="src/app/admin/courses/[courseId]/page.jsx",
         desc="Admin has no Store pricing management: no UI on /admin/courses/[courseId] and no service wrapper for a store/pricing endpoint.",
         steps="1. Sign in as ADMIN\n2. Open /admin/courses/<id>",
         expected="Admin can set price, discount and free flag (CLAUDE.md §8 ADMIN).",
         actual="Page has no price/discount/isFree/store reference; src/services has no store/pricing endpoint. Consequence: every live published course has store=null and shows 'Pricing unavailable'.",
         severity="High", file="src/app/admin/courses/[courseId]/page.jsx"),
    dict(id="DEF-004", tc="TC-CL-001", component="src/lib/axios.js",
         desc="Pages/components call HTTP directly, bypassing src/services.",
         steps="Run sync_tracker.py (TC-CL-001) or grep imports of axios / @/lib/axios in src/app and src/components.",
         expected="All HTTP calls go Component → Hook → Service → Axios (CLAUDE.md §5).",
         actual="instructor/courses/[courseId]/page.jsx (api.post /api/ai/apply, /quizzes, /course-import/jobs/:id/import); DocxViewer.jsx and PptViewer.jsx (axios.get file fetch).",
         severity="Medium", file="src/app/instructor/courses/[courseId]/page.jsx; src/components/shared/DocxViewer.jsx; src/components/shared/PptViewer.jsx"),
    dict(id="DEF-005", tc="TC-CL-002", component="src/lib/axios.js",
         desc="A query hook and feature API modules use the axios instance directly instead of a src/services module.",
         steps="Run sync_tracker.py (TC-CL-002).",
         expected="HTTP only inside src/services (CLAUDE.md §5).",
         actual="src/hooks/queries/instructor/useCourseImport.js; src/features/ai-assistant/api/aiAssistant.api.js; src/features/chat/api/chat.api.js",
         severity="Low", file="src/hooks/queries/instructor/useCourseImport.js; src/features/*/api/*.js"),
    dict(id="DEF-006", tc="TC-CL-014; TC-API-012; TC-API-013", component="src/app/qa-course-preview/page.jsx",
         desc="Temporary QA/verification routes are deployed publicly: /qa-course-preview (bypasses the student auth guard) and /zz-slider-check (fixture prices incl. 4999).",
         steps="GET https://lms-web-demo.vercel.app/qa-course-preview and /zz-slider-check",
         expected="Routes deleted after verification, as their own header comments state; 404 in production.",
         actual="Both return HTTP 200 on the deployment (2026-10-14).",
         severity="Medium", file="src/app/qa-course-preview/page.jsx; src/app/zz-slider-check/page.jsx"),
    dict(id="DEF-007", tc="TC-CL-013", component="src/lib/courseMapper.js",
         desc="CLAUDE.md requires shared helpers courseUnits.js / resumeTarget.js and an order-consistency test resumeTarget.test.js; none exist.",
         steps="ls src/lib/courseUnits.js src/lib/resumeTarget.js src/lib/__tests__/resumeTarget.test.js",
         expected="Files exist, or CLAUDE.md names the helpers actually used.",
         actual="All three are missing, so the documented Prev/Next vs resume traversal-order guarantee is not enforced by any test.",
         severity="Low", file="CLAUDE.md; src/lib/"),
    dict(id="DEF-008", tc="Build & Lint: Lint", component="(repository root scripts)",
         desc="`npm run lint` exits 1: 13 errors, all in root-level one-off scripts (@typescript-eslint/no-require-imports / parse).",
         steps="npm run lint",
         expected="Lint exits 0.",
         actual="Errors only in fix_imports.js, strip_*.js, update_css*.js, update_theme*.js; 0 errors under src/ (130 warnings project-wide).",
         severity="Low", file="fix_imports.js; strip_*.js; update_css*.js; update_theme*.js"),
    dict(id="DEF-010", tc="TC-CL-016; TC-UI-ADM-004; TC-UI-ADM-001", component="src/app/admin/courses/[courseId]/page.jsx",
         desc="Admin course detail page never loads: it shows the loading spinner forever and never requests the course.",
         steps="1. Sign in as ADMIN (local)\n2. Open /admin/courses/cmuarm65w0001e41yf7se0an8\n3. Wait 30 s",
         expected="Course details, stats and curriculum render.",
         actual="Spinner for 30 s+; API calls only GET /auth/profile, /notifications, /calendar (no GET /courses/:id); no console error. Cause: commit bf1787c (2026-07-03) removed the useEffect that called loadCourse() on mount; loadCourse() now runs only after save/delete, and `loading` starts true.",
         severity="High", file="src/app/admin/courses/[courseId]/page.jsx"),
]
