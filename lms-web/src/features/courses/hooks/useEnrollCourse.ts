export function useEnrollCourse() {
  const enroll = () => {
    console.log("Enrolled");
  };

  return {
    enroll,
  };
}
