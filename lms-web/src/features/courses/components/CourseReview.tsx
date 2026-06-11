type CourseReviewProps = {
  review: string;
};

export default function CourseReview({
  review,
}: CourseReviewProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      {review}
    </div>
  );
}
