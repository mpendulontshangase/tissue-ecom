import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/lib/db/schema";

const statusTone: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-950",
  confirmed: "bg-sky-100 text-sky-950",
  processing: "bg-indigo-100 text-indigo-950",
  out_for_delivery: "bg-emerald-100 text-emerald-950",
  delivered: "bg-pine text-foam",
  cancelled: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusTone[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = status === "paid" ? "bg-emerald-100 text-emerald-950" : "bg-sand text-bark";
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${tone}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
