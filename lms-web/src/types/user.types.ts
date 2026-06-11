export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  avatar?: string;
  createdAt: Date;
};
