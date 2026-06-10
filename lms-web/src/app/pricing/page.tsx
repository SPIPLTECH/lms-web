import PricingCard from "./component/PricingCard";

export default function PricingPage() {
  const plans = [
    {
      title: "Basic",
      price: "₹499",
      features: [
        "Access to basic courses",
        "Community support",
        "Limited quizzes",
      ],
    },

    {
      title: "Pro",
      price: "₹999",
      features: [
        "All courses access",
        "AI Tutor",
        "Certificates",
        "Assignments",
      ],
    },

    {
      title: "Enterprise",
      price: "₹1999",
      features: [
        "Team access",
        "Advanced analytics",
        "Priority support",
        "Custom LMS features",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 py-16 px-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          Pricing Plans
        </h1>

        <p className="text-gray-600 text-lg">
          Choose the best plan for your learning journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <PricingCard
            key={plan.title}
            title={plan.title}
            price={plan.price}
            features={plan.features}
          />
        ))}
      </div>
    </main>
  );
}