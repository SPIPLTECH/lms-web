/**
 * passwordPolicy.js mirrors the backend policy (lms-api
 * src/modules/auth/password.policy.js). These cases pin the regex and the
 * submit-time checks used by Reset Password and every Change Password modal.
 */
import {
  PASSWORD_REGEX,
  PASSWORD_RULES,
  PASSWORD_POLICY_MESSAGE,
  getNewPasswordError,
} from "../passwordPolicy.js";

function runTests() {
  const cases = [
    { name: "regex accepts a compliant password", run: () => PASSWORD_REGEX.test("Str0ng!Pass") },
    { name: "regex rejects under 8 characters", run: () => !PASSWORD_REGEX.test("Aa1!aaa") },
    { name: "regex rejects missing uppercase", run: () => !PASSWORD_REGEX.test("str0ng!pass") },
    { name: "regex rejects missing lowercase", run: () => !PASSWORD_REGEX.test("STR0NG!PASS") },
    { name: "regex rejects missing digit", run: () => !PASSWORD_REGEX.test("Strong!Pass") },
    { name: "regex rejects missing special character", run: () => !PASSWORD_REGEX.test("Str0ngPass1") },
    { name: "regex rejects whitespace", run: () => !PASSWORD_REGEX.test("Str0ng! Pass") },
    { name: "regex rejects over 128 characters", run: () => !PASSWORD_REGEX.test("Aa1!" + "a".repeat(125)) },
    {
      name: "every rule is met by a compliant password",
      run: () => PASSWORD_RULES.every((rule) => rule.test("Str0ng!Pass")),
    },
    {
      name: "no rule is met by an empty password",
      run: () => PASSWORD_RULES.every((rule) => !rule.test("")),
    },
    {
      name: "weak new password returns the policy message",
      run: () =>
        getNewPasswordError({ newPassword: "password", confirmPassword: "password" }) ===
        PASSWORD_POLICY_MESSAGE,
    },
    {
      name: "new password equal to current is rejected",
      run: () =>
        getNewPasswordError({
          currentPassword: "Str0ng!Pass",
          newPassword: "Str0ng!Pass",
          confirmPassword: "Str0ng!Pass",
        }) === "New password must be different from your current password.",
    },
    {
      name: "mismatched confirmation is rejected",
      run: () =>
        getNewPasswordError({ newPassword: "Str0ng!Pass", confirmPassword: "Str0ng!Pas" }) ===
        "Passwords do not match.",
    },
    {
      name: "valid, different, confirmed password passes",
      run: () =>
        getNewPasswordError({
          currentPassword: "Old0ne!Pass",
          newPassword: "Str0ng!Pass",
          confirmPassword: "Str0ng!Pass",
        }) === "",
    },
  ];

  let passed = 0;
  let failed = 0;

  console.log("=== RUNNING PASSWORD POLICY TESTS ===");
  cases.forEach((tc) => {
    if (tc.run()) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  });

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
