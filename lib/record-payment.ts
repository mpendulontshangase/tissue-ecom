import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications, orders, paymentEvents, users } from "@/lib/db/schema";
import { orderLink, sendCustomerEmail } from "@/lib/email";
import { checkoutMatchesOrder } from "@/lib/yoco";

export async function recordYocoPayment(input: {
  eventId: string;
  eventType: string;
  amountCents: number;
  currency?: string;
  checkoutId?: string;
  orderId?: string;
  paymentId?: string;
  succeeded: boolean;
}) {
  const db = getDb();
  const [order] = input.checkoutId
    ? await db.select().from(orders).where(eq(orders.yocoCheckoutId, input.checkoutId)).limit(1)
    : input.orderId
      ? await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1)
      : [undefined];

  if (!order || order.paymentMethod !== "yoco") {
    return { ok: true as const, ignored: true as const };
  }

  const matches = checkoutMatchesOrder({
    amountCents: input.amountCents,
    currency: input.currency,
    checkoutId: input.checkoutId,
    orderId: input.orderId,
    expectedAmountCents: order.totalCents,
    expectedCheckoutId: order.yocoCheckoutId,
    expectedOrderId: order.id,
  });

  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: "yoco",
      eventId: input.eventId,
      orderId: order.id,
      eventType: input.eventType,
    })
    .onConflictDoNothing()
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) return { ok: true as const, duplicate: true as const };
  if (!matches) return { ok: true as const, ignored: true as const };

  if (input.succeeded) {
    if (order.paymentStatus === "paid") return { ok: true as const, alreadyPaid: true as const };
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentReference: input.paymentId ?? order.paymentReference,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await notifyPayment(order.id, order.userId, order.orderNumber, "Card payment received.");
    return { ok: true as const, paid: true as const };
  }

  if (order.paymentStatus === "pending_payment") {
    await db
      .update(orders)
      .set({ paymentStatus: "failed", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
  }
  return { ok: true as const, failed: true as const };
}

async function notifyPayment(orderId: string, userId: string, orderNumber: number, sentence: string) {
  const [user] = await getDb().select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const title = `Payment received for order #${orderNumber}`;
  const body = `${sentence} Order #${orderNumber} is marked paid.`;
  const email = user
    ? await sendCustomerEmail({
        to: user.email,
        subject: title,
        text: `Hello ${user.name},\n\n${body}\n\nView the order: ${orderLink(orderId)}`,
      })
    : { status: "skipped" as const };
  await getDb().insert(notifications).values({
    userId,
    orderId,
    title,
    body,
    emailStatus: email.status,
  });
}
