export default function TeamSection() {
  const team = [
    {
      name: "Prasad Kulkarni",
      role: "Founder & Developer",
    },

    {
      name: "AI Learning Team",
      role: "Research & Innovation",
    },
  ];

  return (
    <section className="py-20 px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-10 text-center">
          Meet Our Team
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {team.map((member) => (
            <div
              key={member.name}
              className="border rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold">
                {member.name}
              </h3>

              <p className="text-gray-600 mt-2">
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}