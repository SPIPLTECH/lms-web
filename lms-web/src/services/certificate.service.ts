import api from "@/lib/axios";

export const certificateService = {
  getCertificates: async () =>
    api.get("/certificates"),

  downloadCertificate: async (
    id: string
  ) =>
    api.get(`/certificates/${id}`),
};
