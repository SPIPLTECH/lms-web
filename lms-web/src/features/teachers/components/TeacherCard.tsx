type TeacherCardProps = {
  name: string;
  subject: string;
};

export default function TeacherCard({
  name,
  subject,
}: TeacherCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-2">
        {name}
      </h2>

      <p className="text-gray-600">
        Subject: {subject}
      </p>
    </div>
  );
}
