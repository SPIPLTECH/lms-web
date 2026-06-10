type AssignmentDetailsProps = {
  description: string;
};

export default function AssignmentDetails({
  description,
}: AssignmentDetailsProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">
        Assignment Details
      </h2>

      <p className="text-gray-600 leading-7">
        {description}
      </p>
    </div>
  );
}