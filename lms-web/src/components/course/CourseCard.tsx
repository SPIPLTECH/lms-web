type CourseCardProps = {
  title: string;
  instructor: string;
  price: string;
};

export default function CourseCard({
  title,
  instructor,
  price,
}: CourseCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-gray-600 mb-2">
        Instructor: {instructor}
      </p>

      <p className="text-orange-500 font-bold">
        {price}
      </p>
    </div>
  );
}