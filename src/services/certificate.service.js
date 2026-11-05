import api from "@/lib/axios";

export const getCertificates = async (userId, courseId) => {
  let url = "/certificates";
  const params = new URLSearchParams();

  if (userId) {
    params.append("userId", userId);
  }
  if (courseId) {
    params.append("courseId", courseId);
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await api.get(url);
  return response.data?.data ?? response.data;
};

export const getCertificateById = async (id) => {
  const response = await api.get(`/certificates/${id}`);
  return response.data?.data ?? response.data;
};

export const createCertificate = async (data) => {
  const response = await api.post("/certificates", data);
  return response.data?.data ?? response.data;
};

/**
 * Builds a standardized readable certificate filename:
 * Course_Ranger_<Student_Name>_<Course_Name>.pdf
 */
export const buildCertificateFilename = (cert = {}) => {
  const sanitize = (str) =>
    String(str || "")
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .replace(/\s+/g, "_");

  const studentName = sanitize(cert.student?.user?.name || cert.studentName || "Student");
  const courseTitle = sanitize(cert.course?.title || cert.courseTitle || "Course");

  const safeStudent = studentName.substring(0, 40) || "Student";
  const safeCourse = courseTitle.substring(0, 50) || "Course";

  return `Course_Ranger_${safeStudent}_${safeCourse}.pdf`;
};

export const downloadCertificatePdf = async (certificateId, customFilename) => {
  const response = await api.get(`/certificates/${certificateId}/pdf`, {
    responseType: "blob",
  });

  // Try extracting filename from Content-Disposition header
  let filename = customFilename;
  const disposition =
    response.headers?.["content-disposition"] ||
    response.headers?.["Content-Disposition"];

  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) {
      filename = match[1].trim();
    }
  }

  if (!filename) {
    filename = "Course_Ranger_Certificate.pdf";
  }

  const blob = new Blob([response.data], { type: "application/pdf" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};
