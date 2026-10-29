import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { completeOnboarding } from "@/services/student.service";

/**
 * Marks the first-run onboarding done (finished the tour, or "Not now"). The
 * flag lives on the profile AuthContext holds, so the session profile is
 * re-read: the banner and Getting started then disappear on every page.
 */
export default function useCompleteOnboarding() {
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => refreshUser(),
  });
}
