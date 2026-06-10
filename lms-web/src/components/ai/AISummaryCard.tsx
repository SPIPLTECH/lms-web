type AISummaryCardProps = {
  summary: string;
};

export default function AISummaryCard({
  summary,
}: AISummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        AI Summary
      </h2>

      <p className="text-gray-600 leading-7">
        {summary}
      </p>
    </div>
  );
}