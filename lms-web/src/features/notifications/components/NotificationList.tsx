import NotificationCard from "./NotificationCard";

export default function NotificationList() {
  const notifications = [
    {
      title: "Course Update",
      message: "New lesson uploaded.",
    },

    {
      title: "Assignment Reminder",
      message: "Assignment due tomorrow.",
    },
  ];

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.title}
          title={notification.title}
          message={notification.message}
        />
      ))}
    </div>
  );
}
