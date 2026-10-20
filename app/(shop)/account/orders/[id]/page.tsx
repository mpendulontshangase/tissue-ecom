import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/catalog";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatWhen, formatZar, isUuid } from "@/lib/format";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();
  const detail = await getOrderForUser(id, user.id, user.role === "admin");
  if (!detail) notFound();
  const { order, items, updates } = detail;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/account/orders" className="text-sm font-semibold text-pine">
        All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl tracking-tight">Order #{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p className="mt-2 text-sm text-bark">{formatWhen(order.createdAt)}</p>
      {query.placed === "1" ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Order received. Payment is pending — {PAYMENT_METHOD_LABELS[order.paymentMethod].toLowerCase()}.
        </p>
      ) : null}

      <section className="mt-8 rounded-3xl border border-line bg-foam p-5">
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
              <span className="whitespace-nowrap">{formatZar(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{order.deliveryFeeCents === 0 ? "Free" : formatZar(order.deliveryFeeCents)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatZar(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-foam p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl">Delivery</h2>
        <p className="mt-3">
          {order.recipientName}
          <br />
          {order.phone}
          <br />
          {order.line1}
          {order.line2 ? (
            <>
              <br />
              {order.line2}
            </>
          ) : null}
          <br />
          {order.city}, {order.province}, {order.postalCode}
        </p>
        <p className="mt-3 text-bark">
          {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          {order.paymentReference ? ` · ${order.paymentReference}` : ""}
        </p>
        {order.notes ? <p className="mt-2">Note: {order.notes}</p> : null}
        {order.paymentMethod === "eft" && order.paymentStatus === "pending_payment" ? (
          <p className="mt-3 text-bark">Banking details arrive with the confirmation update. Do not pay before then.</p>
        ) : null}
      </section>

      <section className="mt-4">
        <h2 className="font-serif text-2xl">Updates</h2>
        {updates.length === 0 ? (
          <p className="mt-3 text-sm text-bark">No messages yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {updates.map((update) => (
              <li key={update.id} className="rounded-2xl border border-line bg-foam p-4">
                <p className="font-semibold">{update.title}</p>
                <p className="mt-1 text-sm leading-6">{update.body}</p>
                <p className="mt-2 text-xs text-bark">{formatWhen(update.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
