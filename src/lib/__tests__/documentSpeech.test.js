import { buildDocxSpeech, buildPdfPageSpeech, pdfChunkRects } from "../documentSpeech.js";

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const item = (str, x, y, width, hasEOL = false) => ({ str, hasEOL, transform: [12, 0, 0, 12, x, y], width, height: 12 });

function runTests() {
  const pdfItems = [
    item("Variables store data in a program. Each", 72, 700, 300),
    { type: "beginMarkedContent" },
    item("variable has a name and a value.", 72, 684, 240, true),
    item("Memory is reused when a block ends and its variables go away.", 72, 668, 400, true),
  ];
  const page = buildPdfPageSpeech(pdfItems, "en-US");
  const baseTransform = [1, 0, 0, -1, 0, 792]; // US Letter, y flipped like pdf.js

  const docxElements = [
    { type: "paragraph", style: "h1", runs: [{ text: "Operating Systems" }] },
    { type: "paragraph", runs: [{ text: "An OS manages ", bold: false }, { text: "hardware and software", bold: true }, { text: ". It also schedules processes for the CPU." }] },
    { type: "image", src: "data:," },
    { type: "table", rows: [["Name", "Role"], ["Kernel", "Core"], ["", ""]] },
  ];
  const docx = buildDocxSpeech(docxElements, "en-US");

  const cases = [
    {
      name: "pdf: joins text items across lines and splits into sentences",
      run: () => page.chunks,
      expected: ["Variables store data in a program.", "Each variable has a name and a value.", "Memory is reused when a block ends and its variables go away."],
    },
    { name: "pdf: marked-content markers are ignored", run: () => page.items.length, expected: 3 },
    {
      name: "pdf: a line-end hyphen joins the word",
      run: () => buildPdfPageSpeech([item("This is compu-", 0, 0, 10, true), item("ter science, explained plainly.", 0, 0, 10)]).chunks,
      expected: ["This is compu-ter science, explained plainly."],
    },
    { name: "pdf: an empty (scanned) page has no chunks", run: () => buildPdfPageSpeech([]).chunks, expected: [] },
    {
      name: "pdf: a heading (bigger text, then a blank line) is read on its own",
      run: () =>
        buildPdfPageSpeech([
          { str: "Operating Systems Basics", hasEOL: false, transform: [20, 0, 0, 20, 72, 702], width: 235 },
          { str: "", hasEOL: true, transform: [1, 0, 0, 1, 0, 0], width: 0 },
          item("An operating system manages hardware. It", 72, 662, 300, true),
          item("schedules processes so many programs share one CPU.", 72, 648, 320),
        ]).chunks,
      expected: ["Operating Systems Basics", "An operating system manages hardware.", "It schedules processes so many programs share one CPU."],
    },
    {
      name: "pdf: a sentence spanning two items gets a box on each line",
      run: () => pdfChunkRects(page, 1, baseTransform, 1).length,
      expected: 2,
    },
    {
      name: "pdf: boxes are placed from the text position and scale with zoom",
      run: () => {
        const [first] = pdfChunkRects(page, 0, baseTransform, 2);
        return first.left === 144 && Math.round(first.top) === (792 - 700) * 2 - 24 && first.width > 0;
      },
      expected: true,
    },
    { name: "pdf: out-of-range chunk gives no boxes", run: () => pdfChunkRects(page, 9, baseTransform, 1), expected: [] },

    {
      name: "docx: headings, paragraphs and table rows become chunks; images and empty rows are skipped",
      run: () => docx.chunks,
      expected: ["Operating Systems", "An OS manages hardware and software.", "It also schedules processes for the CPU.", "Name, Role", "Kernel, Core"],
    },
    {
      name: "docx: runs are split at sentence boundaries without losing text or formatting runs",
      run: () => docx.paragraphs[1].map((s) => [s.runIndex, s.text, s.chunkIndex]),
      expected: [[0, "An OS manages ", 1], [1, "hardware and software", 1], [2, ".", 1], [2, " ", null], [2, "It also schedules processes for the CPU.", 2]],
    },
    { name: "docx: table rows map to their chunk", run: () => docx.rows, expected: { "3:0": 3, "3:1": 4 } },
  ];

  let passed = 0;
  let failed = 0;
  console.log("=== RUNNING DOCUMENT SPEECH TESTS ===");
  for (const testCase of cases) {
    let actual;
    try {
      actual = testCase.run();
    } catch (error) {
      actual = `THREW: ${error.message}`;
    }
    if (deepEqual(actual, testCase.expected)) {
      console.log(`[PASS] ${testCase.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testCase.name}`);
      console.error(`  expected: ${JSON.stringify(testCase.expected)}`);
      console.error(`  actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }
  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
