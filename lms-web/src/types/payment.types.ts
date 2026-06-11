export type Payment = {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED";
  userId: string;
};
