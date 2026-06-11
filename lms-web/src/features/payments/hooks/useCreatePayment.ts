export function useCreatePayment() {
  const createPayment = () => {
    console.log("Payment Created");
  };

  return {
    createPayment,
  };
}
