import AnalyticsCard from "./AnalyticsCard";

export default function AnalyticsStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <AnalyticsCard
        title="Total Students"
        value="1,240"
      />

      <AnalyticsCard
        title="Courses"
        value="48"
      />

      <AnalyticsCard
        title="Revenue"
        value="₹2.5L"
      />

      <AnalyticsCard
        title="Certificates"
        value="860"
      />
    </div>
  );
}