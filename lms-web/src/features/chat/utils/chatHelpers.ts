export function generateChatId() {
  return Math.random()
    .toString(36)
    .substring(2);
}
