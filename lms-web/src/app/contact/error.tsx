"use client";

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export default function ContactErrorPage({
  error,
  reset,
}: ErrorProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">
        Something went wrong
      </h1>

      <p className="text-gray-600 mb-6">
        {error.message}
      </p>

      <button
        onClick={reset}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg"
      >
        Try Again
      </button>
    </div>
  );
}