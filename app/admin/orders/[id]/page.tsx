import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EftDetails } from "@/components/eft-details";
import { OrderUpdateForm } from "@/components/order-update-form";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { getOrderForUser } from "@/lib/catalog";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { bankDetailsComplete, getPaymentConfig } from "@/lib/payment-config";
import { formatWhen, formatZar, isUuid } from "@/lib/format";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const detail = await getOrderForUser(id, admin.id, true);
  if (!detail) notFound();
  const { order, customerName, customerEmail, items, updates } = detail;
  const payments = order.paymentMethod === "eft" ? await getPaymentConfig() : null;

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-semibold text-pine">
        All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">#{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p className="mt-2 break-all text-sm text-bark">
        {customerName} · {customerEmail} · {formatWhen(order.createdAt)}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-foam p-5 text-sm leading-6">
            <h2 className="font-serif text-2xl">Delivery</h2>
            <p className="mt-3">
              {order.recipientName} · {order.phone}
              <br />
              {order.line1}
              {order.line2 ? `, ${order.line2}` : ""}
              <br />
              {order.city}, {order.province}, {order.postalCode}
            </p>
            <p className="mt-2 text-bark">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
              {order.paymentMethod === "pay_on_delivery" ? " · no longer offered for new orders" : ""}
              {order.paymentMethod === "yoco" && order.paymentReference ? ` · ${order.paymentReference}` : ""}
            </p>
            {payments && bankDetailsComplete(payments.bank) ? (
              <EftDetails bank={payments.bank} orderNumber={order.orderNumber} />
            ) : null}
            {order.notes ? <p className="mt-2">Note: {order.notes}</p> : null}
          </section>
          <section className="rounded-3xl border border-line bg-foam p-5">
            <h2 className="font-serif text-2xl">Cartons</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.quantity} × {item.productName}
                    <span className="block text-bark">
                      {item.quantity * item.packSize} {item.unitLabel}
                    </span>
                  </span>
                  <span>{formatZar(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 font-semibold">Total {formatZar(order.totalCents)}</p>
          </section>
          <section>
            <h2 className="font-serif text-2xl">History</h2>
            <ol className="mt-3 space-y-3">
              {updates.map((update) => (
                <li key={update.id} className="rounded-2xl border border-line bg-foam p-4 text-sm">
                  <p className="font-semibold">{update.title}</p>
                  <p className="mt-1 leading-6">{update.body}</p>
                  <p className="mt-2 text-xs text-bark">
                    {formatWhen(update.createdAt)} · email {update.emailStatus}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <OrderUpdateForm
          orderId={order.id}
          status={order.status}
          paymentPending={order.paymentStatus === "pending_payment" || order.paymentStatus === "failed"}
        />
      </div>
    </div>
  );
}
