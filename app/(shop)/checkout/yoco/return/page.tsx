import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/catalog";
import { getPaymentConfig } from "@/lib/payment-config";
import { recordYocoPayment } from "@/lib/record-payment";
import { isUuid } from "@/lib/format";
import { lookupYocoCheckout } from "@/lib/yoco";

export const metadata = { title: "Card payment" };

export default function YocoReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; result?: string }>;
}) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Checking the payment…</div>}>
      <YocoReturnBody searchParams={searchParams} />
    </Suspense>
  );
}

async function YocoReturnBody({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; result?: string }>;
}) {
  await connection();
  const user = await getCurrentUser();
  const query = await searchParams;
  const orderId = query.order ?? "";
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/yoco/return?order=${orderId}&result=${query.result ?? ""}`)}`);
  if (!isUuid(orderId)) {
    return <Message title="Payment" body="That payment link is not valid." />;
  }

  const detail = await getOrderForUser(orderId, user.id, user.role === "admin");
  if (!detail || detail.order.paymentMethod !== "yoco") {
    return <Message title="Payment" body="That order is not a card payment." />;
  }

  let paid = detail.order.paymentStatus === "paid";
  if (!paid && query.result === "success" && detail.order.yocoCheckoutId) {
    const config = await getPaymentConfig();
    const checkout = config.yocoSecretKey
      ? await lookupYocoCheckout(config.yocoSecretKey, detail.order.yocoCheckoutId)
      : null;
    if (checkout?.status === "completed") {
      await recordYocoPayment({
        eventId: `lookup:${checkout.id}:${checkout.paymentId ?? "completed"}`,
        eventType: "checkout.lookup",
        amountCents: checkout.amount,
        currency: checkout.currency,
        checkoutId: checkout.id,
        orderId: detail.order.id,
        paymentId: checkout.paymentId ?? undefined,
        succeeded: true,
      });
      revalidatePath("/", "layout");
      const again = await getOrderForUser(orderId, user.id, user.role === "admin");
      paid = again?.order.paymentStatus === "paid";
    }
  }

  const result = query.result;
  const body = paid
    ? "Yoco confirmed the card payment. The order is marked paid."
    : result === "cancel"
      ? "The card payment was cancelled. The order is still awaiting payment. This page does not mark an order paid."
      : result === "failure"
        ? "Yoco did not complete the card payment. The order stays awaiting payment until a verified Yoco update says otherwise."
        : "The card payment is not confirmed yet. Returning from Yoco does not mark the order paid. It is marked paid only after Yoco confirms it.";

  return (
    <Message title={paid ? "Payment received" : "Awaiting payment"} body={body} href={`/account/orders/${orderId}`} />
  );
}

function Message({ title, body, href = "/account/orders" }: { title: string; body: string; href?: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-bark">{body}</p>
      <Link href={href} className="mt-6 inline-flex min-h-11 items-center font-semibold text-pine">
        View the order
      </Link>
    </div>
  );
}
