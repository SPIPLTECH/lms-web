import { sortGradables } from "../gradableSort.js";

function runTests() {
  const row = (id, lastSubmittedAt) => ({ id, lastSubmittedAt });

  const testCases = [
    {
      name: "'recent' puts the newest submission first",
      input: [row("a", "2026-09-10T10:00:00Z"), row("b", "2026-09-15T10:00:00Z"), row("c", "2026-09-12T10:00:00Z")],
      sort: "recent",
      expected: ["b", "c", "a"],
    },
    {
      name: "rows nobody has submitted to sink below ones that have",
      input: [row("a", null), row("b", "2026-09-15T10:00:00Z"), row("c", null)],
      sort: "recent",
      expected: ["b", "a", "c"],
    },
    {
      name: "unsubmitted rows keep their original order rather than shuffling",
      input: [row("a", null), row("b", null), row("c", null)],
      sort: "recent",
      expected: ["a", "b", "c"],
    },
    {
      name: "an unparseable date is treated as no submission, not as epoch zero",
      input: [row("a", "not-a-date"), row("b", "2026-09-15T10:00:00Z")],
      sort: "recent",
      expected: ["b", "a"],
    },
    {
      name: "the default sort leaves the server's order untouched",
      input: [row("a", "2026-09-10T10:00:00Z"), row("b", "2026-09-15T10:00:00Z")],
      sort: "created",
      expected: ["a", "b"],
    },
    {
      name: "an unknown sort key falls back to the server's order",
      input: [row("a", "2026-09-10T10:00:00Z"), row("b", "2026-09-15T10:00:00Z")],
      sort: "bogus",
      expected: ["a", "b"],
    },
    {
      name: "an empty list is handled",
      input: [],
      sort: "recent",
      expected: [],
    },
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc) => {
    const original = tc.input.map((r) => r.id);
    const result = sortGradables(tc.input, tc.sort).map((r) => r.id);
    const matches = JSON.stringify(result) === JSON.stringify(tc.expected);
    // Sorting must not reorder the caller's array in place.
    const didNotMutate = JSON.stringify(tc.input.map((r) => r.id)) === JSON.stringify(original);

    if (matches && didNotMutate) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", tc.expected);
      console.error("  Actual:  ", result);
      if (!didNotMutate) console.error("  (mutated the input array)");
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
