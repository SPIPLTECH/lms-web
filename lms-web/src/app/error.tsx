"use client";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function RootErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-5xl font-bold text-red-500 mb-4">
        Something Went Wrong
      </h1>

      <p className="text-gray-600 mb-8 text-center">
        {error.message}
      </p>

      <button
        onClick={reset}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl"
      >
        Try Again
      </button>
    </div>
  );
}