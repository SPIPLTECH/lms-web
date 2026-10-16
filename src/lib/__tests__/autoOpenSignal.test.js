import { resolveAutoOpen } from "../autoOpenSignal.js";

/**
 * The Course Map's "Add Content" action opens the Add Content picker by
 * bumping a counter that LessonComposerPanel watches. Two rules were bolted
 * onto that counter at different times and quietly cancelled each other out:
 *
 *   1. The panel de-duplicates by VALUE — `handled === signal` means "already
 *      did this one" — which assumes the counter never repeats a value.
 *   2. The parent RESETS the counter to 0 once consumed, so a stale non-zero
 *      value can't re-fire when the panel remounts.
 *
 * Reset + increment regenerates values the panel has already seen, so a
 * genuine new click arrives wearing an old number and gets discarded as a
 * repeat. Because the swallowed click never consumes, the counter is NOT
 * reset, so the NEXT click lands on a fresh value and works — producing the
 * maddening every-other-time failure captured in the screen recording:
 *
 *      click 1 ✓   click 2 ✗   click 3 ✓   click 4 ✓   click 5 ✗
 *
 * resolveAutoOpen owns that protocol so the two rules can coexist: the marker
 * is cleared the moment the counter returns to 0, which is exactly when the
 * parent has told us there is no pending request.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The parent (page / OverviewView) that owns the counter. */
function makeParent() {
  return {
    signal: 0,
    request() {
      this.signal += 1;
    },
    consume() {
      this.signal = 0;
    },
  };
}

/** The panel that watches it, holding `handled` across renders like a ref. */
function makePanel() {
  return {
    handled: null,
    /** One run of the effect. */
    render(signal, isLoading = false) {
      const { open, handled } = resolveAutoOpen({
        signal,
        isLoading,
        handled: this.handled,
      });
      this.handled = handled;
      return open;
    },
    /** composerMode switched away and back — a brand-new mount. */
    remount() {
      this.handled = null;
    },
  };
}

/**
 * One "Add Content" click: the parent bumps, the effect runs, and if it fired
 * the parent resets — which re-renders and runs the effect once more.
 */
function click(parent, panel, isLoading = false) {
  parent.request();
  let opened = panel.render(parent.signal, isLoading);
  if (isLoading) {
    // The content query settles and the effect re-runs on the isLoading dep.
    opened = panel.render(parent.signal, false);
  }
  if (opened) {
    parent.consume();
    panel.render(parent.signal, false);
  }
  return opened;
}

function runTests() {
  const cases = [];

  cases.push({
    name: "REGRESSION: five consecutive Add Content clicks all open the picker",
    run: () => {
      const parent = makeParent();
      const panel = makePanel();
      // Before the fix this returned [true,false,true,true,false] — the exact
      // ✓✗✓✓✗ pattern timed off the screen recording.
      return [1, 2, 3, 4, 5].map(() => click(parent, panel));
    },
    expected: [true, true, true, true, true],
  });

  cases.push({
    name: "the counter returning to 0 clears the handled marker",
    run: () => {
      const panel = makePanel();
      panel.render(1);
      const afterOpen = panel.handled;
      panel.render(0);
      return [afterOpen, panel.handled];
    },
    expected: [1, null],
  });

  cases.push({
    name: "a repeated value is still swallowed while the request is unconsumed",
    run: () => {
      // Parent never resets (no onAutoOpenConsumed wired). The effect re-runs
      // on isLoading flips, and must not open the picker a second time.
      const panel = makePanel();
      return [
        panel.render(1, false),
        panel.render(1, true),
        panel.render(1, false),
        panel.render(1, false),
      ];
    },
    expected: [true, false, false, false],
  });

  cases.push({
    name: "a request that arrives while loading fires once loading finishes",
    run: () => {
      const panel = makePanel();
      return [panel.render(1, true), panel.render(1, false)];
    },
    expected: [false, true],
  });

  cases.push({
    name: "a fresh mount with no pending request does not fire",
    run: () => {
      const panel = makePanel();
      return panel.render(0);
    },
    expected: false,
  });

  cases.push({
    name: "a fresh mount WITH a pending request fires — the whole point",
    run: () => {
      const panel = makePanel();
      return panel.render(3);
    },
    expected: true,
  });

  cases.push({
    name: "remounting mid-session does not replay an already-consumed request",
    run: () => {
      const parent = makeParent();
      const panel = makePanel();
      click(parent, panel);
      // composerMode switched away and back; the counter is 0 because the
      // click was consumed, so the new mount must stay quiet.
      panel.remount();
      return panel.render(parent.signal);
    },
    expected: false,
  });

  cases.push({
    name: "clicks still work after a remount",
    run: () => {
      const parent = makeParent();
      const panel = makePanel();
      click(parent, panel);
      panel.remount();
      return [click(parent, panel), click(parent, panel)];
    },
    expected: [true, true],
  });

  cases.push({
    name: "a negative or undefined counter is treated as no request",
    run: () => {
      const panel = makePanel();
      return [panel.render(undefined), panel.render(-1), panel.render(0)];
    },
    expected: [false, false, false],
  });

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING AUTO-OPEN SIGNAL TESTS ===");
  for (const tc of cases) {
    let actual;
    try {
      actual = tc.run();
    } catch (e) {
      actual = `threw: ${e.message}`;
    }
    if (same(actual, tc.expected)) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error("  Expected:", JSON.stringify(tc.expected));
      console.error("  Actual:  ", JSON.stringify(actual));
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
