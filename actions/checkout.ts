"use server";

import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isForSale } from "@/lib/catalog";
import { readCart, writeCart } from "@/lib/cart";
import { deliveryFeeCents, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { notifications, orderItems, orders, products } from "@/lib/db/schema";
import { orderLink, sendCustomerEmail } from "@/lib/email";
import { formatZar } from "@/lib/format";
import { checkoutMethods, eftInstructions, getPaymentConfig } from "@/lib/payment-config";
import { publicBaseUrl } from "@/lib/public-url";
import { createYocoCheckout } from "@/lib/yoco";
import {
  checkoutSchema,
  fieldErrorsFrom,
  normalizePhone,
  type ActionState,
} from "@/lib/validation";

class CheckoutError extends Error {}

export async function placeOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/checkout");
  const parsed = checkoutSchema.safeParse({
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: String(formData.get("line2") ?? ""),
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    notes: String(formData.get("notes") ?? ""),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: "Enter a valid South African phone number" } };

  const lines = await readCart();
  if (lines.length === 0) return { error: "Your cart is empty." };

  const methods = await checkoutMethods();
  if (!methods.includes(parsed.data.paymentMethod)) {
    return { error: "That payment method is not available." };
  }

  let placed: {
    id: string;
    orderNumber: number;
    totalCents: number;
    items: { name: string; quantity: number; priceCents: number }[];
  } | null = null;

  try {
    const db = getDb();
    placed = await db.transaction(async (tx) => {
      const ids = lines.map((line) => line.productId).sort();
      const locked = await tx
        .select()
        .from(products)
        .where(inArray(products.id, ids))
        .orderBy(asc(products.id))
        .for("update");

      const byId = new Map(locked.map((product) => [product.id, product]));
      const priced = [];
      for (const line of lines) {
        const product = byId.get(line.productId);
        if (!product || !isForSale(product)) {
          throw new CheckoutError("A carton in your cart is no longer available.");
        }
        if (product.stock < line.quantity) {
          throw new CheckoutError(
            `Only ${product.stock} cartons of ${product.name} are in stock.`,
          );
        }
        priced.push({ product, quantity: line.quantity });
      }

      const subtotalCents = priced.reduce(
        (total, line) => total + line.product.priceCents * line.quantity,
        0,
      );
      const fee = deliveryFeeCents(subtotalCents);
      const totalCents = subtotalCents + fee;

      const [order] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          paymentMethod: parsed.data.paymentMethod,
          paymentStatus: "pending_payment",
          paymentProvider: parsed.data.paymentMethod === "yoco" ? "yoco" : "eft",
          subtotalCents,
          deliveryFeeCents: fee,
          totalCents,
          recipientName: parsed.data.recipientName,
          phone,
          line1: parsed.data.line1,
          line2: parsed.data.line2 || null,
          city: parsed.data.city,
          province: parsed.data.province,
          postalCode: parsed.data.postalCode,
          notes: parsed.data.notes || null,
        })
        .returning();
      if (!order) throw new CheckoutError("Could not create the order.");

      if (parsed.data.paymentMethod === "eft") {
        await tx
          .update(orders)
          .set({ paymentReference: String(order.orderNumber) })
          .where(eq(orders.id, order.id));
      }

      await tx.insert(orderItems).values(
        priced.map((line) => ({
          orderId: order.id,
          productId: line.product.id,
          productName: line.product.name,
          packSize: line.product.packSize,
          sheetsPerUnit: line.product.sheetsPerUnit,
          unitLabel: line.product.unitLabel,
          unitPriceCents: line.product.priceCents,
          quantity: line.quantity,
          lineTotalCents: line.product.priceCents * line.quantity,
        })),
      );

      for (const line of priced) {
        const updated = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${line.quantity}`,
            updatedAt: sql`now()`,
          })
          .where(and(eq(products.id, line.product.id), gte(products.stock, line.quantity)))
          .returning({ id: products.id });
        if (updated.length !== 1) {
          throw new CheckoutError(`Only ${line.product.stock} cartons of ${line.product.name} are in stock.`);
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        items: priced.map((line) => ({
          name: line.product.name,
          quantity: line.quantity,
          priceCents: line.product.priceCents,
        })),
      };
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof CheckoutError) return { error: error.message };
    console.error(error instanceof Error ? error.message : "checkout failed");
    return { error: "Could not place the order. Please try again." };
  }

  if (!placed) return { error: "Could not place the order. Please try again." };

  try {
    if (parsed.data.paymentMethod === "yoco") {
      const config = await getPaymentConfig();
      const base = await publicBaseUrl();
      if (!base) throw new CheckoutError("Set NEXT_PUBLIC_APP_URL before taking card payments.");
      const checkout = await createYocoCheckout({
        secretKey: config.yocoSecretKey,
        amountCents: placed.totalCents,
        orderId: placed.id,
        orderNumber: placed.orderNumber,
        successUrl: `${base}/checkout/yoco/return?order=${placed.id}&result=success`,
        cancelUrl: `${base}/checkout/yoco/return?order=${placed.id}&result=cancel`,
        failureUrl: `${base}/checkout/yoco/return?order=${placed.id}&result=failure`,
        lineItems: placed.items.map((item) => ({
          displayName: item.name,
          quantity: item.quantity,
          priceCents: item.priceCents,
        })),
      });
      await getDb()
        .update(orders)
        .set({ yocoCheckoutId: checkout.id, paymentReference: checkout.id, updatedAt: new Date() })
        .where(eq(orders.id, placed.id));
      await notifyPlaced(user, placed.id, placed.orderNumber, placed.totalCents, "yoco");
      await writeCart([]);
      revalidatePath("/", "layout");
      redirect(checkout.redirectUrl);
    }

    const config = await getPaymentConfig();
    await notifyPlaced(user, placed.id, placed.orderNumber, placed.totalCents, "eft", eftInstructions(config.bank, placed.orderNumber));
  } catch (error) {
    unstable_rethrow(error);
    await undoOrder(placed.id);
    if (error instanceof CheckoutError) return { error: error.message };
    console.error(error instanceof Error ? error.message : "payment start failed");
    return { error: "Card payment could not be started. Nothing was charged, and the order was not kept." };
  }

  await writeCart([]);
  revalidatePath("/", "layout");
  redirect(`/account/orders/${placed.id}?placed=1`);
}

async function notifyPlaced(
  user: { id: string; email: string; name: string },
  orderId: string,
  orderNumber: number,
  totalCents: number,
  method: "yoco" | "eft",
  extra = "",
) {
  const title = `Order #${orderNumber} received`;
  const body = [
    `We have your order for ${formatZar(totalCents)}.`,
    `Payment method: ${PAYMENT_METHOD_LABELS[method]}. The order is awaiting payment.`,
    extra,
  ]
    .filter(Boolean)
    .join("\n\n");
  const email = await sendCustomerEmail({
    to: user.email,
    subject: title,
    text: `Hello ${user.name},\n\n${body}\n\nView the order: ${orderLink(orderId)}`,
  });
  await getDb().insert(notifications).values({
    userId: user.id,
    orderId,
    title,
    body,
    emailStatus: email.status,
  });
}

async function undoOrder(orderId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (!item.productId) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId));
    }
    await tx.delete(orders).where(eq(orders.id, orderId));
  });
}
