"use server";

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getProductById } from "@/lib/catalog";
import { STATUS_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { notifications, orderItems, orders, paymentSettings, productImages, products, shopSettings, users } from "@/lib/db/schema";
import { orderLink, sendCustomerEmail } from "@/lib/email";
import { isUuid, slugify } from "@/lib/format";
import { imageSizeError, imageTypeError, MAX_PRODUCT_IMAGES } from "@/lib/image-limits";
import { getPaymentConfig, getPaymentRow } from "@/lib/payment-config";
import { encryptSecret } from "@/lib/secrets";
import {
  fieldErrorsFrom,
  normalizeHttpsUrl,
  normalizePhone,
  normalizeWhatsapp,
  orderUpdateSchema,
  paymentSettingsSchema,
  productSchema,
  randsToCents,
  shopSettingsSchema,
  type ActionState,
} from "@/lib/validation";

function refresh() {
  revalidatePath("/", "layout");
}

type PreparedFile = { bytes: Buffer; mimeType: string };

type ImagePlan = {
  tokens: string[];
  files: PreparedFile[];
  mainKey: string;
};

async function readImagePlan(formData: FormData, productId: string | null): Promise<ImagePlan | { error: string }> {
  const tokens = String(formData.get("imageOrder") ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  const mainKey = String(formData.get("mainKey") ?? "").trim();
  const uploads = formData.getAll("imageFile").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (tokens.length > MAX_PRODUCT_IMAGES || uploads.length > MAX_PRODUCT_IMAGES) {
    return { error: "A product can have at most 4 pictures." };
  }

  const newTokens = tokens.filter((token) => token.startsWith("new:"));
  if (newTokens.length !== uploads.length || newTokens.some((token, index) => token !== `new:${index}`)) {
    return { error: "The picture list is out of date. Refresh the page and try again." };
  }

  const kept = tokens.filter((token) => !token.startsWith("new:"));
  if (kept.some((token) => !isUuid(token))) {
    return { error: "The picture list is out of date. Refresh the page and try again." };
  }
  if (!productId && kept.length > 0) {
    return { error: "Save the product before attaching existing pictures." };
  }
  if (new Set(kept).size !== kept.length) {
    return { error: "Each picture can only appear once." };
  }
  if (mainKey && !tokens.includes(mainKey)) {
    return { error: "Choose which picture is shown on the shop." };
  }

  const files: PreparedFile[] = [];
  for (const file of uploads) {
    const typeError = imageTypeError(file.type);
    if (typeError) return { error: typeError };
    const sizeError = imageSizeError(file.size);
    if (sizeError) return { error: sizeError };
    files.push({ bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type });
  }

  return { tokens, files, mainKey };
}

async function writeImages(
  tx: Pick<ReturnType<typeof getDb>, "select" | "insert" | "update" | "delete">,
  productId: string,
  plan: ImagePlan,
) {
  const current = await tx
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const currentIds = new Set(current.map((row) => row.id));
  const kept = plan.tokens.filter((token) => !token.startsWith("new:"));
  if (kept.some((id) => !currentIds.has(id))) {
    throw new Error("One of the pictures is no longer on this product.");
  }

  const remove = [...currentIds].filter((id) => !kept.includes(id));
  if (remove.length > 0) {
    await tx.delete(productImages).where(inArray(productImages.id, remove));
  }

  let index = 0;
  for (const token of plan.tokens) {
    const isMain = plan.mainKey ? token === plan.mainKey : index === 0;
    if (token.startsWith("new:")) {
      const file = plan.files[Number(token.slice(4))];
      if (!file) throw new Error("A picture failed to upload.");
      await tx.insert(productImages).values({
        productId,
        mimeType: file.mimeType,
        bytes: file.bytes,
        sortOrder: index,
        isMain,
      });
    } else {
      await tx
        .update(productImages)
        .set({ sortOrder: index, isMain })
        .where(and(eq(productImages.id, token), eq(productImages.productId, productId)));
    }
    index += 1;
  }
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

  const images = await readImagePlan(formData, current?.id ?? null);
  if ("error" in images) return { error: images.error };

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
    active: parsed.data.active,
    archivedAt: parsed.data.active ? null : (current?.archivedAt ?? null),
    sortOrder: parsed.data.sortOrder,
    updatedAt: new Date(),
  };

  try {
    if (current) {
      await db.transaction(async (tx) => {
        await tx.update(products).set(values).where(eq(products.id, current.id));
        await writeImages(tx, current.id, images);
      });
      refresh();
      return { ok: "Product updated" };
    }
    const [created] = await db.transaction(async (tx) => {
      const inserted = await tx.insert(products).values(values).returning({ id: products.id });
      const row = inserted[0];
      if (!row) return [];
      await writeImages(tx, row.id, images);
      return inserted;
    });
    refresh();
    if (created) redirect(`/admin/products/${created.id}/edit?created=1`);
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "save product failed";
    if (message.startsWith("One of the pictures") || message.startsWith("A picture failed")) {
      return { error: message };
    }
    console.error(message);
    return { error: "Could not save the product." };
  }
  return { error: "Could not save the product." };
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/admin/products");

  const current = await getProductById(id);
  if (!current || current.archivedAt) redirect("/admin/products");

  const db = getDb();
  const [refs] = await db.select({ value: count() }).from(orderItems).where(eq(orderItems.productId, id));
  if ((refs?.value ?? 0) > 0) {
    await db
      .update(products)
      .set({ archivedAt: new Date(), active: false, updatedAt: new Date() })
      .where(eq(products.id, id));
    refresh();
    redirect("/admin/products?notice=archived");
  }

  await db.delete(products).where(eq(products.id, id));
  refresh();
  redirect("/admin/products?notice=deleted");
}

export async function saveShopSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = shopSettingsSchema.safeParse({
    shopName: formData.get("shopName"),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    tiktokUrl: String(formData.get("tiktokUrl") ?? ""),
    whatsappUrl: String(formData.get("whatsappUrl") ?? ""),
    xUrl: String(formData.get("xUrl") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Could not save shop settings.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const phone = parsed.data.contactPhone ? normalizePhone(parsed.data.contactPhone) : "";
  const whatsapp = normalizeWhatsapp(parsed.data.whatsappUrl);
  if (phone === null || whatsapp === null) {
    return { error: "Could not save shop settings." };
  }

  const values = {
    shopName: parsed.data.shopName,
    contactPhone: phone ?? "",
    contactEmail: parsed.data.contactEmail,
    facebookUrl: normalizeHttpsUrl(parsed.data.facebookUrl) ?? "",
    instagramUrl: normalizeHttpsUrl(parsed.data.instagramUrl) ?? "",
    tiktokUrl: normalizeHttpsUrl(parsed.data.tiktokUrl) ?? "",
    whatsappUrl: whatsapp,
    xUrl: normalizeHttpsUrl(parsed.data.xUrl) ?? "",
    updatedAt: new Date(),
  };

  try {
    await getDb()
      .insert(shopSettings)
      .values({ id: "default", ...values })
      .onConflictDoUpdate({ target: shopSettings.id, set: values });
  } catch (error) {
    unstable_rethrow(error);
    console.error(error instanceof Error ? error.message : "save shop settings failed");
    return { error: "Could not save shop settings." };
  }

  refresh();
  return { ok: "Shop settings saved" };
}

export async function savePaymentSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const current = await getPaymentConfig();
  const parsed = paymentSettingsSchema.safeParse({
    yocoEnabled: formData.get("yocoEnabled") === "on",
    eftEnabled: formData.get("eftEnabled") === "on",
    yocoPublicKey:
      current.yocoPublicSource === "environment" ? current.yocoPublicKey : String(formData.get("yocoPublicKey") ?? ""),
    yocoSecretKey: current.yocoSecretSource === "environment" ? "" : String(formData.get("yocoSecretKey") ?? ""),
    yocoWebhookSecret: current.yocoWebhookSource === "environment" ? "" : String(formData.get("yocoWebhookSecret") ?? ""),
    bankAccountName: formData.get("bankAccountName"),
    bankName: formData.get("bankName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankBranchCode: formData.get("bankBranchCode"),
    bankAccountType: formData.get("bankAccountType"),
  });
  if (!parsed.success) {
    return { error: "Could not save payment settings.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const row = await getPaymentRow();
  const secretStored = parsed.data.yocoSecretKey ? encryptSecret(parsed.data.yocoSecretKey) : row.yocoSecretKey;
  const webhookStored = parsed.data.yocoWebhookSecret ? encryptSecret(parsed.data.yocoWebhookSecret) : row.yocoWebhookSecret;
  const hasSecret = current.yocoSecretSource === "environment" || Boolean(parsed.data.yocoSecretKey) || Boolean(current.yocoSecretKey);
  const hasPublic = Boolean(parsed.data.yocoPublicKey);
  if (parsed.data.yocoEnabled && (!hasSecret || !hasPublic || current.secretUnreadable && !parsed.data.yocoSecretKey && current.yocoSecretSource !== "environment")) {
    return {
      error: "Add the Yoco public key and secret key before enabling card payments.",
      fieldErrors: { yocoSecretKey: "A secret key is required." },
    };
  }

  const values = {
    yocoEnabled: parsed.data.yocoEnabled,
    eftEnabled: parsed.data.eftEnabled,
    yocoPublicKey: current.yocoPublicSource === "environment" ? row.yocoPublicKey : parsed.data.yocoPublicKey,
    yocoSecretKey: secretStored,
    yocoWebhookSecret: webhookStored,
    bankAccountName: parsed.data.eftEnabled ? parsed.data.bankAccountName : parsed.data.bankAccountName,
    bankName: parsed.data.bankName,
    bankAccountNumber: parsed.data.bankAccountNumber,
    bankBranchCode: parsed.data.bankBranchCode,
    bankAccountType: parsed.data.bankAccountType,
    updatedAt: new Date(),
  };

  try {
    await getDb()
      .insert(paymentSettings)
      .values({ id: "default", ...values })
      .onConflictDoUpdate({ target: paymentSettings.id, set: values });
  } catch (error) {
    unstable_rethrow(error);
    console.error(error instanceof Error ? error.message : "save payment settings failed");
    return { error: "Could not save payment settings." };
  }

  refresh();
  return { ok: "Payment settings saved" };
}

export async function markOrderPaid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!isUuid(orderId)) return { error: "Order not found." };

  const db = getDb();
  const [row] = await db
    .select({ order: orders, email: users.email, name: users.name })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return { error: "Order not found." };
  if (row.order.paymentStatus === "paid") return { error: "This order is already marked paid." };

  const title = `Payment received for order #${row.order.orderNumber}`;
  const body = `Payment for order #${row.order.orderNumber} has been marked as received.`;
  try {
    const email = await sendCustomerEmail({
      to: row.email,
      subject: title,
      text: `Hello ${row.name},\n\n${body}\n\nView the order: ${orderLink(orderId)}`,
    });
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
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
    console.error(error instanceof Error ? error.message : "mark paid failed");
    return { error: "Could not mark the order paid." };
  }

  refresh();
  return { ok: "Payment marked as paid" };
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
  return { ok: "Order updated" };
}

export async function markNotificationsRead() {
  const user = await requireUser("/account/notifications");
  await getDb()
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, user.id), sql`${notifications.readAt} is null`));
  refresh();
}
