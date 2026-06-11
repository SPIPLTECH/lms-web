type NotificationItemProps = {
  message: string;
};

export default function NotificationItem({
  message,
}: NotificationItemProps) {
  return (
    <div className="border-b py-3">
      {message}
    </div>
  );
}
