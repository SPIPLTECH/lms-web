"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
  RefreshCw,
} from "lucide-react";
import { useUploadQuestionsFile } from "@/hooks/queries/instructor/useQuestionRepository";
import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";

/** Quotes a CSV cell when its text would otherwise break the row apart. */
const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function UploadQuestionsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const uploadMutation = useUploadQuestionsFile();

  // The samples name one of the instructor's own courses, so a downloaded
  // sample imports as it stands. With no course yet they leave the cells
  // blank, which is valid: a question need not belong to a course.
  const { data: courses } = useInstructorCourses();
  const sampleCourse = Array.isArray(courses) ? courses[0] : null;
  const sampleCourseTitle = sampleCourse?.title || "";
  const sampleModuleTitle = sampleCourse?.modules?.[0]?.title || "";

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv") || name.endsWith(".json")) {
      setSelectedFile(file);
      setErrorMessage("");
      setUploadResult(null);
    } else {
      setErrorMessage("Please upload an Excel (.xlsx), CSV (.csv), or JSON (.json) file.");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setErrorMessage("");
    setUploadResult(null);

    try {
      const response = await uploadMutation.mutateAsync(selectedFile);
      if (response.success && response.data) {
        setUploadResult(response.data);
      } else {
        setErrorMessage(response.message || "Failed to process question file.");
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Upload failed.");
    }
  };

  // Download Sample Templates
  const handleDownloadSampleJson = () => {
    const sample = [
      {
        title: "Python List Comprehension",
        question: "What is the result of [x*2 for x in range(3)]?",
        type: "MCQ_SINGLE",
        // Optional: the exact title (or ID) of one of your courses, and of a
        // module inside it. Leave both out for a question with no course.
        course: sampleCourseTitle,
        module: sampleModuleTitle,
        subject: "Python",
        topic: "Lists",
        difficulty: "EASY",
        marks: 2,
        options: [
          { optionText: "[0, 2, 4]", isCorrect: true },
          { optionText: "[0, 1, 2]", isCorrect: false },
          { optionText: "[2, 4, 6]", isCorrect: false }
        ],
        correctAnswer: "[0, 2, 4]",
        explanation: "range(3) produces 0, 1, 2. Multiplying by 2 gives 0, 2, 4."
      },
      {
        title: "HTTP Status Code",
        question: "Which HTTP status code represents 'Created'?",
        type: "MCQ_SINGLE",
        course: sampleCourseTitle,
        subject: "Web Development",
        topic: "HTTP",
        difficulty: "EASY",
        marks: 1,
        options: [
          { optionText: "201", isCorrect: true },
          { optionText: "200", isCorrect: false },
          { optionText: "404", isCorrect: false }
        ],
        correctAnswer: "201"
      },
      {
        title: "HTTP Request Flow",
        question: "Arrange the steps of an HTTP request in order.",
        type: "ARRANGE_TOKENS",
        subject: "Web Development",
        topic: "HTTP",
        difficulty: "MEDIUM",
        marks: 2,
        // Listed in their correct order — students see them shuffled.
        options: ["DNS lookup", "TCP handshake", "HTTP request sent", "Response received"],
        explanation: "A request resolves the host, opens a connection, then sends and receives."
      },
      {
        title: "HTTP Status Meanings",
        question: "Match each status code to its meaning.",
        type: "MATCH_PAIRS",
        subject: "Web Development",
        topic: "HTTP",
        difficulty: "MEDIUM",
        marks: 2,
        options: {
          left: ["200", "404", "500"],
          right: ["OK", "Not Found", "Server Error"]
        },
        explanation: "The right-hand column is shuffled for students."
      }
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-questions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleCsv = () => {
    // `course` and `module` are optional: the last two rows leave them blank.
    const course = csvCell(sampleCourseTitle);
    const courseModule = csvCell(sampleModuleTitle);
    const csvContent = `title,type,subject,difficulty,marks,question,option1,option2,option3,option4,correctAnswer,explanation,course,module
Python Variables,MCQ_SINGLE,Python,EASY,1,What is the keyword to define a function in Python?,func,def,function,define,option 2,Functions in Python are defined using the def keyword.,${course},${courseModule}
JavaScript Async,MCQ_MULTI,Web Development,MEDIUM,2,Which of these are JavaScript primitive types?,string,number,array,object,string|number,Arrays and objects are reference types.,${course},
HTTP Request Flow,ARRANGE_TOKENS,Web Development,MEDIUM,2,Arrange the steps of an HTTP request in order,DNS lookup,TCP handshake,HTTP request sent,Response received,,Option columns are the tokens in their correct order.,,
HTTP Status Codes,MATCH_PAIRS,Web Development,MEDIUM,2,Match each status code to its meaning,200 => OK,404 => Not Found,500 => Server Error,301 => Moved Permanently,,Each option column holds one pair written as left => right.,,`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-questions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrorReport = () => {
    if (!uploadResult || !uploadResult.errors) return;

    const blob = new Blob([JSON.stringify(uploadResult.errors, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-upload-error-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center space-x-3">
          <Link
            href="/instructor/questions"
            className="p-2 rounded-xl bg-background border border-transparent text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="sr-only">
              Bulk Upload Questions
            </h1>
            <p className="sr-only">
              Upload questions via Excel (.xlsx), CSV (.csv), or JSON (.json) files into your repository.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sample Download Bar */}
        <div className="p-4 rounded-2xl bg-background/90 border border-transparent flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-foreground font-medium">Download Sample Template Formats:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadSampleCsv}
              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-amber-400 border border-amber-500/30 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
            <button
              onClick={handleDownloadSampleJson}
              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-amber-400 border border-amber-500/30 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample JSON</span>
            </button>
          </div>
        </div>

        {/* Supported types & column conventions */}
        <div className="p-4 rounded-2xl bg-background/90 border border-transparent text-xs space-y-2">
          <p className="text-foreground font-medium">
            Supported <span className="font-mono">type</span> values — one of these four, nothing else:
          </p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-mono text-amber-400">MCQ_SINGLE</span> — option columns hold the choices;{" "}
              <span className="font-mono">correctAnswer</span> names one of them (its text, or <span className="font-mono">option 2</span>).
            </li>
            <li>
              <span className="font-mono text-amber-400">MCQ_MULTI</span> — same columns, with every correct option
              listed in <span className="font-mono">correctAnswer</span>, separated by <span className="font-mono">|</span>.
            </li>
            <li>
              <span className="font-mono text-amber-400">ARRANGE_TOKENS</span> — the option columns are the tokens,
              read left to right as the correct order. Students see them shuffled.
            </li>
            <li>
              <span className="font-mono text-amber-400">MATCH_PAIRS</span> — each option column holds one pair written
              as <span className="font-mono">left =&gt; right</span>.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Older files using True / False, Short Answer or Long Answer are reported row by row and skipped.
          </p>
          <p className="text-foreground font-medium pt-2">Course and module — optional:</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-mono text-amber-400">course</span> — the exact title (or ID) of one of your
              courses. Leave it blank for a question that belongs to no course.
            </li>
            <li>
              <span className="font-mono text-amber-400">module</span> — the title (or ID) of a module inside that
              course. Needs <span className="font-mono">course</span> filled in too.
            </li>
          </ul>
          <p className="text-muted-foreground">
            A row naming a course or module that is not yours is reported and skipped; the other rows still import.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Upload Error</p>
              <p className="mt-1 text-xs">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
            dragActive
              ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
              : selectedFile
              ? "border-emerald-500/60 bg-emerald-950/10"
              : "border-transparent hover:border-transparent bg-background/50"
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-transparent flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            {selectedFile ? (
              <div>
                <p className="text-lg font-semibold text-emerald-300">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for validation</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-foreground">
                  Drag & Drop your <span className="text-amber-400 font-semibold">Excel, CSV, or JSON</span> file
                </p>
                <p className="text-xs text-muted-foreground mt-1">Files must specify question, subject, topic, difficulty, type, and options/answers; course and module are optional</p>
              </div>
            )}

            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-sm font-medium border border-transparent pointer-events-auto transition"
            >
              {selectedFile ? "Change File" : "Browse File"}
            </button>
          </div>
        </div>

        {selectedFile && !uploadResult && (
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center space-x-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Validating...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Import Questions</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Summary Report */}
        {uploadResult && (
          <div className="p-6 rounded-3xl bg-background/90 border border-transparent space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg font-bold">Question Import Summary Report</h3>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-rose-300 border border-rose-800 text-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Error Report</span>
                </button>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-background/60 border border-transparent">
                <p className="text-2xl font-bold text-foreground">{uploadResult.total}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Total Processed</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/60 border border-transparent">
                <p className="text-2xl font-bold text-emerald-400">{uploadResult.importedCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Successfully Imported</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/60 border border-transparent">
                <p className="text-2xl font-bold text-rose-400">{uploadResult.failedCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Failed</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/60 border border-transparent">
                <p className="text-2xl font-bold text-amber-400">{uploadResult.duplicateCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Duplicates Skipped</p>
              </div>
            </div>

            {/* Error List */}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-transparent">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Validation Error Log ({uploadResult.errors.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {uploadResult.errors.map((err, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-background/80 border border-rose-900/60 flex items-start justify-between text-xs">
                      <div>
                        <span className="font-mono text-rose-400 font-bold mr-2">Row {err.row}:</span>
                        <span className="font-semibold text-foreground mr-2">[{err.code}]</span>
                        <span className="text-foreground">{err.message}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-[11px] truncate max-w-xs">{err.question}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Link
                href="/instructor/questions"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Go to Question Repository
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
