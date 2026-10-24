"use client";

import { useState, useRef, useCallback } from "react";
import { FaCloudUploadAlt, FaTimes, FaCheckCircle, FaExclamationCircle, FaFileAlt, FaDownload } from "@/components/ui/reactIcons";
import { useImportQuestions } from "@/hooks/queries/instructor/useImportQuestions";

const ACCEPTED_FORMATS = ".csv,.xlsx,.xls,.json,.txt,.docx,.pdf";
const FORMAT_LABELS = ["CSV", "Excel (.xlsx/.xls)", "JSON", "TXT", "DOCX", "PDF"];

// `explanation` says why the correct answer is right. The optional
// optionX_explanation columns (CSV) and an option's own `explanation` (JSON)
// say why that option is wrong — shown on a Self-Test once the student checks
// their answer. A correct option needs none.
const CSV_TEMPLATE = `question,optionA,optionB,optionC,optionD,correctAnswer,marks,difficulty,explanation,optionA_explanation,optionB_explanation,optionC_explanation,optionD_explanation
"What is JSX in React?","A templating engine","JavaScript XML syntax extension","Java Syntax Extension","A CSS framework","JavaScript XML syntax extension",1,EASY,"JSX allows writing HTML-like code in JavaScript","JSX is compiled to JavaScript calls; it is not a separate templating engine.",,"JSX stands for JavaScript XML and has nothing to do with Java.","JSX describes markup, not styles."
"Which hook manages state in React?","useEffect","useMemo","useState","useCallback","useState",2,MEDIUM,"useState hook is used to manage component local state","useEffect runs side effects after render; it does not hold state.","useMemo caches a computed value between renders.",,"useCallback caches a function between renders."`;

const JSON_TEMPLATE = JSON.stringify([
    {
        question: "What is the capital of France?",
        options: [
            { optionText: "London", explanation: "London is the capital of the United Kingdom." },
            { optionText: "Berlin", explanation: "Berlin is the capital of Germany." },
            { optionText: "Paris" },
            { optionText: "Madrid", explanation: "Madrid is the capital of Spain." },
        ],
        correctAnswer: "Paris",
        marks: 1,
        difficulty: "EASY",
        explanation: "Paris is the capital and largest city of France.",
    },
    {
        question: "Which language runs in a web browser?",
        options: [
            { optionText: "Java", explanation: "Java runs on the JVM; browsers dropped Java applets years ago." },
            { optionText: "C#", explanation: "C# runs on .NET, not natively in the browser." },
            { optionText: "Python", explanation: "Browsers do not run Python natively." },
            { optionText: "JavaScript" },
        ],
        correctAnswer: "JavaScript",
        marks: 1,
        difficulty: "EASY",
        explanation: "JavaScript is the language every web browser runs natively.",
    },
], null, 2);

function downloadTemplate(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ImportQuestionsModal({ quizId, onClose, onSuccess }) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const importMutation = useImportQuestions();

    const handleFile = (file) => {
        if (!file) return;
        setSelectedFile(file);
        setResult(null);
        setError(null);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragOver(false), []);

    const handleImport = async () => {
        if (!selectedFile) return;
        setError(null);
        setResult(null);
        try {
            const data = await importMutation.mutateAsync({ quizId, file: selectedFile });
            setResult(data?.data || data);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || "Import failed.");
        }
    };

    const handleClose = () => {
        if (!importMutation.isPending) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-transparent bg-background shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-transparent px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Import Questions</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Upload a file to import multiple questions at once.
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={importMutation.isPending}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    {/* Supported Formats */}
                    <div className="rounded-xl border border-transparent bg-muted/50 p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">Supported File Formats</p>
                        <div className="flex flex-wrap gap-2">
                            {FORMAT_LABELS.map((fmt) => (
                                <span
                                    key={fmt}
                                    className="rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-foreground"
                                >
                                    {fmt}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition
                            ${dragOver
                                ? "border-primary bg-primary/5"
                                : selectedFile
                                    ? "border-green-500/50 bg-green-500/5"
                                    : "border-transparent bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_FORMATS}
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files[0])}
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-3">
                                <FaFileAlt size={36} className="text-green-400" />
                                <p className="font-semibold text-foreground">{selectedFile.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(selectedFile.size / 1024).toFixed(1)} KB — click to change file
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <FaCloudUploadAlt size={40} className="text-muted-foreground" />
                                <p className="font-medium text-foreground">
                                    Drop your file here, or click to browse
                                </p>
                                <p className="text-sm text-muted-foreground">Max file size: 20 MB</p>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                            <FaExclamationCircle className="mt-0.5 shrink-0 text-red-400" size={16} />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3 rounded-xl border border-transparent bg-muted p-4">
                            <div className="flex items-center gap-2">
                                <FaCheckCircle className="text-green-400" size={16} />
                                <h3 className="font-semibold text-foreground">Import Complete</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-lg bg-background p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground">{result.total ?? result.inserted}</p>
                                    <p className="text-xs text-muted-foreground">Total Parsed</p>
                                </div>
                                <div className="rounded-lg bg-background p-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{result.inserted}</p>
                                    <p className="text-xs text-muted-foreground">Inserted</p>
                                </div>
                                <div className="rounded-lg bg-background p-3 text-center">
                                    <p className="text-2xl font-bold text-red-400">{result.failed ?? 0}</p>
                                    <p className="text-xs text-muted-foreground">Failed</p>
                                </div>
                            </div>

                            {result.errors?.length > 0 && (
                                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                                    <p className="text-xs font-medium text-muted-foreground">Failed Rows:</p>
                                    {result.errors.map((err, i) => (
                                        <div
                                            key={i}
                                            className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-300"
                                        >
                                            <span className="font-semibold">Row {err.row}:</span>{" "}
                                            {err.errors?.join(", ")}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Templates */}
                    <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Download Sample Templates
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => downloadTemplate(CSV_TEMPLATE, "questions_template.csv", "text/csv")}
                                className="flex items-center gap-2 rounded-lg border border-transparent bg-muted px-3 py-2 text-xs text-foreground transition hover:border-primary/50 hover:text-primary"
                            >
                                <FaDownload size={12} />
                                CSV Template
                            </button>
                            <button
                                type="button"
                                onClick={() => downloadTemplate(JSON_TEMPLATE, "questions_template.json", "application/json")}
                                className="flex items-center gap-2 rounded-lg border border-transparent bg-muted px-3 py-2 text-xs text-foreground transition hover:border-primary/50 hover:text-primary"
                            >
                                <FaDownload size={12} />
                                JSON Template
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-transparent px-6 py-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={importMutation.isPending}
                        className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                        {result ? "Close" : "Cancel"}
                    </button>

                    {!result && (
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={!selectedFile || importMutation.isPending}
                            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FaCloudUploadAlt size={15} />
                            {importMutation.isPending ? "Importing..." : "Import Questions"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
