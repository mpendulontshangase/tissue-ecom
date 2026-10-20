import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/db/schema";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pay_on_delivery: "Pay on delivery",
  eft: "EFT",
  yoco: "Card (Yoco)",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const DELIVERY_FEE_CENTS = 8500;
export const FREE_DELIVERY_OVER_CENTS = 80000;
export const BULK_PRESETS = [1, 5, 10, 20, 50] as const;
export const SESSION_DAYS = 14;
export const CART_COOKIE = "softmill_cart";
export const SESSION_COOKIE = "softmill_session";

export function deliveryFeeCents(subtotalCents: number) {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_DELIVERY_OVER_CENTS ? 0 : DELIVERY_FEE_CENTS;
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
