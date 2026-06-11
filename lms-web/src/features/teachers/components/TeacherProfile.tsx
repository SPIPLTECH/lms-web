type TeacherProfileProps = {
  name: string;
  expertise: string;
};

export default function TeacherProfile({
  name,
  expertise,
}: TeacherProfileProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        {name}
      </h2>

      <p>Expertise: {expertise}</p>
    </div>
  );
}
