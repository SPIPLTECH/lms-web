type StudentCardProps = {
  name: string;
  email: string;
};

export default function StudentCard({
  name,
  email,
}: StudentCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-2">
        {name}
      </h2>

      <p className="text-gray-600">
        {email}
      </p>
    </div>
  );
}
