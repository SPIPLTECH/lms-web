import Cookies from "js-cookie";

/**
 * Uploads a file to the LMS's file storage (R2's private bucket) via the
 * Next.js API route /api/upload, which writes it server-side.
 */
export const uploadFileToBlob = async (file, options = {}) => {
  const token =
    Cookies.get("accessToken") ||
    (typeof window !== "undefined" ? localStorage.getItem("accessToken") : "");

  const formData = new FormData();
  formData.append("file", file);
  // Declares which upload path this is. A STUDENT is only permitted
  // "assignment-submission"; instructor/admin uploads leave it unset.
  if (options.purpose) {
    formData.append("purpose", options.purpose);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Upload failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    url: data.url || data.fileUrl,
    fileUrl: data.url || data.fileUrl,
    pathname: data.pathname,
    contentType: data.contentType,
    originalName: file.name,
    size: file.size,
  };
};
