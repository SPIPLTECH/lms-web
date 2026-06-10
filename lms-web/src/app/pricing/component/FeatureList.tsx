type FeatureListProps = {
  features: string[];
};

export default function FeatureList({
  features,
}: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((feature, index) => (
        <li
          key={index}
          className="border-b pb-2 text-gray-600"
        >
          ✓ {feature}
        </li>
      ))}
    </ul>
  );
}