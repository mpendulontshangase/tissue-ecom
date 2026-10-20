"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getProductById } from "@/lib/catalog";
import { STATUS_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { notifications, orderItems, orders, products, users } from "@/lib/db/schema";
import { orderLink, sendCustomerEmail } from "@/lib/email";
import { slugify } from "@/lib/format";
import {
  fieldErrorsFrom,
  orderUpdateSchema,
  productSchema,
  randsToCents,
  type ActionState,
} from "@/lib/validation";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function refresh() {
  revalidatePath("/", "layout");
}

async function readImage(formData: FormData, fallback: string | null) {
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    if (!imageTypes.has(file.type)) {
      return { error: "Upload a JPEG, PNG, or WebP image." } as const;
    }
    if (file.size > 600_000) {
      return { error: "Image must be under 600KB." } as const;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return { url: `data:${file.type};base64,${bytes.toString("base64")}` } as const;
  }

  if (formData.get("removeImage") === "on") return { url: null } as const;

  const url = String(formData.get("imageUrl") ?? "").trim();
  if (!url) return { url: fallback } as const;
  if (!url.startsWith("/") && !url.startsWith("https://") && !url.startsWith("http://")) {
    return { error: "Image URL must start with http://, https://, or /." } as const;
  }
  return { url } as const;
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    summary: formData.get("summary"),
    description: formData.get("description"),
    packSize: formData.get("packSize"),
    sheetsPerUnit: formData.get("sheetsPerUnit"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    sortOrder: formData.get("sortOrder") || "0",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const priceCents = randsToCents(parsed.data.price);
  if (priceCents === null || priceCents <= 0) {
    return { fieldErrors: { price: "Enter a price in rand, such as 189.00" } };
  }

  const existingId = String(formData.get("id") ?? "");
  const current = existingId ? await getProductById(existingId) : null;
  if (existingId && !current) return { error: "Product not found." };

  const image = await readImage(formData, current?.imageUrl ?? null);
  if ("error" in image) return { error: image.error };

  const slug = parsed.data.slug || slugify(parsed.data.name);
  if (!slug) return { fieldErrors: { slug: "Enter a URL slug" } };

  const db = getDb();
  const [slugOwner] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  if (slugOwner && slugOwner.id !== current?.id) {
    return { fieldErrors: { slug: "That slug is already used" } };
  }

  const values = {
    name: parsed.data.name,
    slug,
    summary: parsed.data.summary,
    description: parsed.data.description,
    packSize: parsed.data.packSize,
    sheetsPerUnit: parsed.data.sheetsPerUnit,
    priceCents,
    stock: parsed.data.stock,
    imageUrl: image.url,
    active: parsed.data.active,
    sortOrder: parsed.data.sortOrder,
    updatedAt: new Date(),
  };

  try {
    if (current) {
      await db.update(products).set(values).where(eq(products.id, current.id));
      refresh();
      return { ok: "Product saved." };
    }
    const [created] = await db.insert(products).values(values).returning({ id: products.id });
    refresh();
    if (created) redirect(`/admin/products/${created.id}/edit?created=1`);
  } catch (error) {
    unstable_rethrow(error);
    console.error(error instanceof Error ? error.message : "save product failed");
    return { error: "Could not save the product." };
  }
  return { error: "Could not save the product." };
}

export async function updateOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = orderUpdateSchema.safeParse({
    status: formData.get("status"),
    message: String(formData.get("message") ?? ""),
    markPaid: formData.get("markPaid") === "on",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const db = getDb();
  const [row] = await db
    .select({ order: orders, email: users.email, name: users.name })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return { error: "Order not found." };

  const nextStatus = parsed.data.status;
  const statusChanged = row.order.status !== nextStatus;
  const paymentChanged = parsed.data.markPaid && row.order.paymentStatus !== "paid";
  const customMessage = parsed.data.message.trim();
  if (!statusChanged && !paymentChanged && !customMessage) {
    return { error: "Change the status, mark payment, or write a message." };
  }

  const title = statusChanged
    ? `Order #${row.order.orderNumber} is ${STATUS_LABELS[nextStatus].toLowerCase()}`
    : `Update on order #${row.order.orderNumber}`;
  const body =
    customMessage ||
    (statusChanged
      ? `Your order #${row.order.orderNumber} is now ${STATUS_LABELS[nextStatus].toLowerCase()}.`
      : `Payment for order #${row.order.orderNumber} has been marked as received.`);

  try {
    const email = await sendCustomerEmail({
      to: row.email,
      subject: title,
      text: `Hello ${row.name},\n\n${body}\n\nView the order: ${orderLink(orderId)}`,
    });

    await db.transaction(async (tx) => {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const cancelling = nextStatus === "cancelled" && row.order.status !== "cancelled";
      const reopening = row.order.status === "cancelled" && nextStatus !== "cancelled";

      for (const item of items) {
        if (!item.productId) continue;
        if (cancelling) {
          await tx
            .update(products)
            .set({
              stock: sql`${products.stock} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));
        } else if (reopening) {
          const updated = await tx
            .update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(and(eq(products.id, item.productId), sql`${products.stock} >= ${item.quantity}`))
            .returning({ id: products.id });
          if (updated.length !== 1) {
            throw new Error(`Not enough stock to reopen ${item.productName}.`);
          }
        }
      }

      await tx
        .update(orders)
        .set({
          status: nextStatus,
          paymentStatus: paymentChanged ? "paid" : row.order.paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(notifications).values({
        userId: row.order.userId,
        orderId,
        title,
        body,
        emailStatus: email.status,
      });
    });
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "Could not update the order.";
    if (message.startsWith("Not enough stock")) return { error: message };
    console.error(message);
    return { error: "Could not update the order." };
  }

  refresh();
  return { ok: "Order updated. The customer can see it under Notifications." };
}

export async function markNotificationsRead() {
  const user = await requireUser("/account/notifications");
  await getDb()
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, user.id), sql`${notifications.readAt} is null`));
  refresh();
}
