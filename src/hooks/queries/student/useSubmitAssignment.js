import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitAssignment } from "@/services/assignment.service";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function useSubmitAssignment(assignmentId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => submitAssignment(assignmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_ASSIGNMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_ASSIGNMENT, assignmentId] });

      // An assignment counts toward its parent's completion at whichever of the
      // four levels it hangs off, so submitting one can move every ancestor's
      // percentage. The backend performs that roll-up; refetch to pick it up.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COURSE_PROGRESS] });
      // A submission completes the assignment's step and can open what follows.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_SEQUENCE] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LEARNING_PATH] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROGRESS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENT_DASHBOARD] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COURSES] });
    },
  });
}
