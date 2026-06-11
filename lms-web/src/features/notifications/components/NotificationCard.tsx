type NotificationCardProps = {
  title: string;
  message: string;
};

export default function NotificationCard({
  title,
  message,
}: NotificationCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-gray-600">
        {message}
      </p>
    </div>
  );
}
