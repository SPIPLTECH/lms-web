export type Course = {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
  instructorId: string;
  createdAt: Date;
};
