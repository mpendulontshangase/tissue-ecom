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
import { paymentAdapterFor } from "@/lib/payments";
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

  let orderId = "";

  try {
    const db = getDb();
    orderId = await db.transaction(async (tx) => {
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
          paymentProvider: parsed.data.paymentMethod,
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

      const payment = await paymentAdapterFor(parsed.data.paymentMethod).start({
        method: parsed.data.paymentMethod,
        amountCents: totalCents,
        orderNumber: order.orderNumber,
        customerEmail: user.email,
      });

      await tx
        .update(orders)
        .set({
          paymentProvider: payment.provider,
          paymentStatus: payment.paymentStatus,
          paymentReference: payment.reference,
        })
        .where(eq(orders.id, order.id));

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

      const title = `Order #${order.orderNumber} received`;
      const body = `We have your order for ${formatZar(totalCents)}. Payment is pending (${PAYMENT_METHOD_LABELS[parsed.data.paymentMethod]}). We will confirm it before delivery.`;
      const email = await sendCustomerEmail({
        to: user.email,
        subject: title,
        text: `${body}\n\nView the order: ${orderLink(order.id)}`,
      });
      await tx.insert(notifications).values({
        userId: user.id,
        orderId: order.id,
        title,
        body,
        emailStatus: email.status,
      });

      return order.id;
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof CheckoutError) return { error: error.message };
    console.error(error instanceof Error ? error.message : "checkout failed");
    return { error: "Could not place the order. Please try again." };
  }

  await writeCart([]);
  revalidatePath("/", "layout");
  redirect(`/account/orders/${orderId}?placed=1`);
}
