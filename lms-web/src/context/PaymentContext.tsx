"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

type Payment = {
  id: number;
  amount: number;
};

type PaymentContextType = {
  payments: Payment[];
};

const PaymentContext =
  createContext<PaymentContextType | null>(
    null
  );

export function PaymentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [payments] =
    useState<Payment[]>([]);

  return (
    <PaymentContext.Provider
      value={{
        payments,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context =
    useContext(PaymentContext);

  if (!context) {
    throw new Error(
      "usePaymentContext must be used inside PaymentProvider"
    );
  }

  return context;
}