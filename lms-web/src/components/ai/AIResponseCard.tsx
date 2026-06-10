type AIResponseCardProps = {
  title: string;
  content: string;
};

export default function AIResponseCard({
  title,
  content,
}: AIResponseCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-2xl font-bold mb-4">
        {title}
      </h3>

      <p className="text-gray-600 leading-7">
        {content}
      </p>
    </div>
  );
}