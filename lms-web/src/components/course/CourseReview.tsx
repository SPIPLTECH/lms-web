type CourseReviewProps = {
  student: string;
  review: string;
};

export default function CourseReview({
  student,
  review,
}: CourseReviewProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-xl font-bold mb-2">
        {student}
      </h3>

      <p className="text-gray-600">
        {review}
      </p>
    </div>
  );
}