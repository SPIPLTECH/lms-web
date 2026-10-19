import api from "@/lib/axios";
import { setSessionCookies } from "@/lib/authCookies";

/* ---------------- Register ---------------- */

export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

/* ---------------- Verify OTP ---------------- */

export const verifyOtp = async (data) => {
  const response = await api.post("/auth/verify-otp", data);
  return response.data;
};

/* ---------------- Resend Verification OTP ---------------- */

export const resendVerificationOtp = async (email) => {
  const response = await api.post("/auth/resend-verification", {
    email,
  });

  return response.data;
};

/* ---------------- Login ---------------- */

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

/* ---------------- Profile ---------------- */

export const getProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};

/* ---------------- Refresh Token ---------------- */

export const refreshToken = async (refreshToken) => {
  const response = await api.post("/auth/refresh-token", {
    refreshToken,
  });

  return response.data;
};

/* ---------------- Logout ---------------- */

export const logoutUser = async (refreshToken) => {
  const response = await api.post("/auth/logout", { refreshToken });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post(
    "/auth/forgot-password",
    { email }
  );

  return response.data;
};

export const resetPassword = async ({
  email,
  otp,
  newPassword,
}) => {
  const response = await api.post(
    "/auth/reset-password",
    {
      email,
      otp,
      newPassword,
    }
  );

  return response.data;
};
/* ---------------- Change Password ---------------- */

// Changing the password signs out every other session; the response carries
// fresh tokens so this one stays signed in.
export const changePassword = async (data) => {
  const response = await api.post("/auth/change-password", data);
  const { accessToken, refreshToken } = response.data?.data || {};
  if (accessToken) setSessionCookies({ accessToken, refreshToken });
  return response.data;
};