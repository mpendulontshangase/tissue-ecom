import Link from "next/link";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/db/schema";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatWhen, formatZar, plural } from "@/lib/format";

export type OrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalCents: number;
  createdAt: Date;
  itemCount: number;
  customerName?: string;
  customerEmail?: string;
  city?: string;
};

export function OrderTable({ rows, hrefFor }: { rows: OrderRow[]; hrefFor: (id: string) => string }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line bg-foam p-6 text-bark">No orders match this view.</p>;
  }

  return (
    <>
      <ul className="space-y-3 lg:hidden">
        {rows.map((order) => (
          <li key={order.id} className="rounded-2xl border border-line bg-foam p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-xl">#{order.orderNumber}</p>
                <p className="text-sm text-bark">{formatWhen(order.createdAt)}</p>
              </div>
              <p className="font-semibold">{formatZar(order.totalCents)}</p>
            </div>
            {order.customerName ? (
              <p className="mt-2 break-all text-sm">
                {order.customerName}
                {order.city ? ` · ${order.city}` : ""}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-bark">{plural(Number(order.itemCount), "carton")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
              <span className="text-xs font-semibold text-bark">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
            </div>
            <Link href={hrefFor(order.id)} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-pine">
              View order
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-foam lg:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-bark">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">When</th>
              {rows.some((row) => row.customerName) ? <th className="px-4 py-3 font-medium">Customer</th> : null}
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3 font-semibold">#{order.orderNumber}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatWhen(order.createdAt)}</td>
                {rows.some((row) => row.customerName) ? (
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] truncate">{order.customerName}</div>
                    <div className="text-xs text-bark">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</div>
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge status={order.paymentStatus} />
                  <div className="mt-1 text-xs text-bark">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatZar(order.totalCents)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={hrefFor(order.id)} className="font-semibold text-pine">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
