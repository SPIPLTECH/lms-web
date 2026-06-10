export default function FeaturesSection() {
  const features = [
    "AI Tutor Assistance",
    "Interactive Quizzes",
    "Course Management",
    "Assignments & Analytics",
    "Certificates",
    "Live Learning Experience",
  ];

  return (
    <section className="py-20 px-8 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-10 text-center">
          Platform Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature}
              className="bg-white p-8 rounded-2xl shadow"
            >
              <h3 className="text-2xl font-semibold">
                {feature}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}