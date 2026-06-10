import FeatureList from "./FeatureList";

type PricingCardProps = {
  title: string;
  price: string;
  features: string[];
};

export default function PricingCard({
  title,
  price,
  features,
}: PricingCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-4">
        {title}
      </h2>

      <p className="text-4xl font-bold text-orange-500 mb-6">
        {price}
      </p>

      <FeatureList features={features} />

      <button className="w-full mt-8 bg-orange-500 text-white py-3 rounded-xl">
        Get Started
      </button>
    </div>
  );
}