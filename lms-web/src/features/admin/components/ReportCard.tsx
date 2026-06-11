type ReportCardProps = {
  title: string;
  value: string;
};

export default function ReportCard({
  title,
  value,
}: ReportCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-semibold mb-2">
        {title}
      </h2>

      <p className="text-3xl font-bold text-orange-500">
        {value}
      </p>
    </div>
  );
}
