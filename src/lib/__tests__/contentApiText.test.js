import { escapeForContentApi, unescapeFromContentApi } from "../contentApiText.js";

function runTests() {
  const testCases = [
    {
      name: "escaped Markdown from the editor decodes back to the Markdown source",
      check: () => {
        const md = "Use `List<String>` and <https://example.com> & `a > b`";
        return unescapeFromContentApi(escapeForContentApi(md)) === md;
      },
    },
    {
      name: "real HTML keeps the escaped tags inside <code> as text",
      check: () => {
        const html = "<p>Tags such as <code>&lt;p&gt;</code> and <code>&lt;/p&gt;</code>.</p>";
        return unescapeFromContentApi(html) === html;
      },
    },
    {
      name: "real HTML keeps an escaped ampersand escaped",
      check: () => {
        const html = "<p>Fish &amp;amp; chips, <code>&lt;img src=\"...\"&gt;</code></p>";
        return unescapeFromContentApi(html) === html;
      },
    },
    {
      name: "a tag-free legacy value still decodes",
      check: () => unescapeFromContentApi("a &lt; b &amp;&amp; c &gt; d") === "a < b && c > d",
    },
    {
      name: "empty values pass through",
      check: () =>
        unescapeFromContentApi("") === "" &&
        unescapeFromContentApi(null) === null &&
        unescapeFromContentApi(undefined) === undefined,
    },
  ];

  let passed = 0;
  let failed = 0;
  testCases.forEach((tc) => {
    let ok = false;
    try {
      ok = tc.check() === true;
    } catch (error) {
      console.error(error);
    }
    if (ok) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
