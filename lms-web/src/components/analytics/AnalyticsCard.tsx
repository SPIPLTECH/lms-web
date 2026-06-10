type AnalyticsCardProps = {
  title: string;
  value: string;
};

export default function AnalyticsCard({
  title,
  value,
}: AnalyticsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-gray-500 mb-2">
        {title}
      </h3>

      <p className="text-4xl font-bold text-orange-500">
        {value}
      </p>
    </div>
  );
}