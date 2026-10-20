import type { PaymentMethod, PaymentStatus } from "@/lib/db/schema";

/**
 * Manual payments are the only methods wired up today.
 * To add PayFast, Paystack, or Stripe, implement PaymentAdapter and
 * branch on the method inside startPayment. Card providers can return
 * a redirectUrl; a webhook can later move paymentStatus to "paid".
 */
export interface PaymentAdapter {
  id: string;
  start(input: {
    method: PaymentMethod;
    amountCents: number;
    orderNumber: number;
    customerEmail: string;
  }): Promise<{
    paymentStatus: Extract<PaymentStatus, "pending_payment" | "paid">;
    provider: string;
    reference: string | null;
    redirectUrl?: string;
  }>;
}

const manualAdapter: PaymentAdapter = {
  id: "manual",
  async start({ method, orderNumber }) {
    if (method === "eft") {
      return {
        paymentStatus: "pending_payment",
        provider: "eft",
        reference: `EFT-${orderNumber}`,
      };
    }
    return {
      paymentStatus: "pending_payment",
      provider: "pay_on_delivery",
      reference: null,
    };
  },
};

export function paymentAdapterFor(method: PaymentMethod): PaymentAdapter {
  if (method !== "pay_on_delivery" && method !== "eft") {
    throw new Error(`Payment method ${method} is not configured yet.`);
  }
  return manualAdapter;
}
