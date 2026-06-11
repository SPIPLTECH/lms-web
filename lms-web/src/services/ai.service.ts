import api from "@/lib/axios";

export const aiService = {
  askTutor: async (prompt: string) =>
    api.post("/ai/tutor", {
      prompt,
    }),
};
