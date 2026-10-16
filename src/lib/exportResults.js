/** Client-side CSV/PDF export for the Results page — no server round-trip needed since the data is already fetched. */

export function exportResultsCsv(studentResults, filenamePrefix = "results") {
  // Quiz Type / Skips / Attempt / Hints are blank for an ordinary quiz and
  // populated for a qualifying test, so one export still covers both rather
  // than needing a separate report.
  const headers = [
    "Student",
    "Type",
    "Title",
    "Quiz Type",
    "Skips",
    "Attempt",
    "Score",
    "Total Marks",
    "Percentage",
    "Passed",
    "Hints Used",
    "Submitted At",
  ];
  const rows = studentResults.map((r) => [
    r.studentName,
    r.type,
    r.title,
    r.quizTag || "",
    r.qualifyingTarget ? `${r.qualifyingTarget.kind}: ${r.qualifyingTarget.title}` : "",
    r.attemptNumber ?? "",
    r.score,
    r.totalMarks,
    `${r.percentage}%`,
    r.passed ? "Yes" : "No",
    r.hintsUsed ?? "",
    r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportResultsPdf(summary, studentResults, filenamePrefix = "results") {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Student Results", 14, 16);

  doc.setFontSize(10);
  const summaryLines = [
    `Average Score: ${summary.avgScore}%`,
    `Highest Score: ${summary.highestScore}%`,
    `Lowest Score: ${summary.lowestScore}%`,
    `Pass Rate: ${summary.passPercentage}%`,
    `Completion Rate: ${summary.completionRate}%`,
    `Pending Evaluations: ${summary.pendingEvaluations}`,
  ];
  doc.text(summaryLines.join("   |   "), 14, 24, { maxWidth: 180 });

  autoTable(doc, {
    startY: 32,
    head: [["Student", "Type", "Title", "Score", "Percentage", "Passed"]],
    body: studentResults.map((r) => [
      r.studentName,
      r.type,
      r.title,
      `${r.score}/${r.totalMarks}`,
      `${r.percentage}%`,
      r.passed ? "Yes" : "No",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [242, 199, 199] },
  });

  doc.save(`${filenamePrefix}-${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Question-level analytics for one quiz, as CSV.
 *
 * Deliberately omits the correct answer: this file leaves the instructor's
 * machine easily, and the question bank is reused across quizzes. Everything
 * here is performance data, which is what the export is for. Correct /
 * Incorrect / Skipped stay separate columns — collapsing them would lose the
 * distinction the analytics exists to surface.
 */
export function exportQuizAnalyticsCsv(analytics, filenamePrefix = "quiz-analytics") {
  if (!analytics?.questions?.length) return;

  const headers = [
    "Order",
    "Question",
    "Concept",
    "Responses",
    "Correct",
    "Incorrect",
    "Skipped",
    "Unanswered",
    "Correct %",
    "Skip %",
    "Hints Used",
    "Avg Seconds",
  ];

  const rows = analytics.questions.map((q) => [
    q.order ?? "",
    q.question,
    q.concept ?? "",
    q.responses,
    q.correct,
    q.incorrect,
    q.skipped,
    q.unanswered,
    `${q.correctRate}%`,
    `${q.skipRate}%`,
    q.hintsUsed,
    q.averageSeconds ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
