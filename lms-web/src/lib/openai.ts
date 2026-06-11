export async function askAI(
  prompt: string
) {
  const response = await fetch(
    "/api/ai/tutor",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        prompt,
      }),
    }
  );

  return response.json();
}
