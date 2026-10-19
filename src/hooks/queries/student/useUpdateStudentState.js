import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { updateStudentState } from "@/services/student.service";

export default function useUpdateStudentState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStudentState,
    meta: { refreshAll: false },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEYS.STUDENT_STATE], data.data || data);
    },
  });
}
