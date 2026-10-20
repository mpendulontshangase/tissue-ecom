import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  notifications,
  orderItems,
  orders,
  products,
  users,
  type OrderStatus,
} from "@/lib/db/schema";
import { isOrderStatus } from "@/lib/constants";

export async function listActiveProducts() {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.sortOrder), asc(products.name));
}

export async function listAllProducts() {
  return getDb().select().from(products).orderBy(asc(products.sortOrder), asc(products.name));
}

export async function getProductBySlug(slug: string) {
  const [product] = await getDb().select().from(products).where(eq(products.slug, slug)).limit(1);
  return product ?? null;
}

export async function getProductById(id: string) {
  const [product] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  return product ?? null;
}

export async function unreadCount(userId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
  return row?.value ?? 0;
}

export async function listNotifications(userId: string) {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function listOrdersForUser(userId: string) {
  const rows = await getDb()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
  return rows;
}

export async function getOrderForUser(orderId: string, userId: string, isAdmin: boolean) {
  const [order] = await getDb()
    .select({
      order: orders,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;
  if (!isAdmin && order.order.userId !== userId) return null;

  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const updates = await getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.orderId, orderId))
    .orderBy(desc(notifications.createdAt));

  return { ...order, items, updates };
}

export type AdminOrderFilter = {
  status?: string;
  q?: string;
};

export async function listOrdersForAdmin(filter: AdminOrderFilter) {
  const conditions = [];
  if (filter.status && isOrderStatus(filter.status)) {
    conditions.push(eq(orders.status, filter.status));
  }
  const query = filter.q?.trim().slice(0, 80) ?? "";
  if (query) {
    const safe = query.replace(/[%_]/g, "");
    const asNumber = Number(safe);
    const matches = [
      ilike(users.email, `%${safe}%`),
      ilike(users.name, `%${safe}%`),
      ilike(orders.phone, `%${safe}%`),
      ilike(orders.city, `%${safe}%`),
    ];
    if (/^\d+$/.test(safe)) matches.push(eq(orders.orderNumber, asNumber));
    const search = or(...matches);
    if (search) conditions.push(search);
  }

  return getDb()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
      city: orders.city,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(orders.id, users.name, users.email)
    .orderBy(desc(orders.createdAt));
}

export async function dashboardStats() {
  const statusRows = await getDb()
    .select({ status: orders.status, value: count() })
    .from(orders)
    .groupBy(orders.status);

  const counts = Object.fromEntries(statusRows.map((row) => [row.status, row.value])) as Partial<
    Record<OrderStatus, number>
  >;

  const [revenue] = await getDb()
    .select({ value: sum(orders.totalCents) })
    .from(orders)
    .where(sql`${orders.status} <> 'cancelled'`);

  const [pendingPayment] = await getDb()
    .select({ value: sum(orders.totalCents) })
    .from(orders)
    .where(and(sql`${orders.status} <> 'cancelled'`, eq(orders.paymentStatus, "pending_payment")));

  const [collected] = await getDb()
    .select({ value: sum(orders.totalCents) })
    .from(orders)
    .where(and(sql`${orders.status} <> 'cancelled'`, eq(orders.paymentStatus, "paid")));

  const recent = await listOrdersForAdmin({});

  return {
    counts,
    orderCount: statusRows.reduce((total, row) => total + row.value, 0),
    revenueCents: Number(revenue?.value ?? 0),
    pendingPaymentCents: Number(pendingPayment?.value ?? 0),
    collectedCents: Number(collected?.value ?? 0),
    recent: recent.slice(0, 6),
  };
}
