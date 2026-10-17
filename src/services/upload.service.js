import api from "@/lib/axios";

/**
 * Generic authenticated file upload — backed by the /files/upload
 * endpoint (not message-specific; it just stores the file and returns its URL).
 * Used anywhere a plain "attach a file, get a URL back" flow is needed
 * (Assessment attachments, Notes attachments).
 */
export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.data;
};
