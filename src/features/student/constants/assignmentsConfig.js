
export const normalizeAssignmentStatus = (assignment) =>
  assignment.status || assignment.submissionStatus || "Not Submitted";
