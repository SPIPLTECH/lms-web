type NotificationBadgeProps = {
  count: number;
};

export default function NotificationBadge({
  count,
}: NotificationBadgeProps) {
  return (
    <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
      {count}
    </div>
  );
}
