export function useNotificationActions() {
  const markAsRead = () => {
    console.log("Marked as read");
  };

  return {
    markAsRead,
  };
}
