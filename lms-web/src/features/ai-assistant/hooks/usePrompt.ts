export function usePrompt() {
  const sendPrompt = () => {
    console.log("Prompt Sent");
  };

  return {
    sendPrompt,
  };
}
