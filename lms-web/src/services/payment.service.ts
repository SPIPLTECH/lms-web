import api from "@/lib/axios";

export const paymentService = {
  createOrder: async (data: unknown) =>
    api.post("/payments/create-order", data),

  verifyPayment: async (data: unknown) =>
    api.post("/payments/verify", data),
};
