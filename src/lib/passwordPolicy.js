/**
 * Password policy — mirrors lms-api src/modules/auth/password.policy.js.
 * The backend is authoritative; this exists so users see the rules and get
 * instant feedback before submitting.
 */

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,128}$/;

export const PASSWORD_RULES = [
  { id: "length", label: "8–128 characters", test: (pw) => pw.length >= 8 && pw.length <= 128 },
  { id: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { id: "digit", label: "One number", test: (pw) => /\d/.test(pw) },
  { id: "special", label: "One special character", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
  { id: "spaces", label: "No spaces", test: (pw) => pw.length > 0 && !/\s/.test(pw) },
];

export const PASSWORD_POLICY_MESSAGE =
  "Password must be 8–128 characters with no spaces, and include an uppercase letter, a lowercase letter, a number and a special character.";

const isValidPassword = (password) => PASSWORD_REGEX.test(password || "");

/**
 * Validate a new password before submit. Returns an error message, or "" when
 * the input is acceptable. `currentPassword` is only known on Change Password.
 */
export const getNewPasswordError = ({ newPassword, confirmPassword, currentPassword }) => {
  if (!newPassword) return "Please enter a new password.";
  if (!isValidPassword(newPassword)) return PASSWORD_POLICY_MESSAGE;
  if (currentPassword && newPassword === currentPassword) {
    return "New password must be different from your current password.";
  }
  if (newPassword !== confirmPassword) return "Passwords do not match.";
  return "";
};
