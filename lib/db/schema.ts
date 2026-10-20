import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (typeof value === "string") {
      return value.startsWith("\\x") ? Buffer.from(value.slice(2), "hex") : Buffer.from(value, "binary");
    }
    return Buffer.alloc(0);
  },
});

export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending_payment",
  "paid",
  "failed",
  "refunded",
]);

export const paymentMethod = pgEnum("payment_method", ["pay_on_delivery", "eft", "yoco"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  packSize: integer("pack_size").notNull(),
  sheetsPerUnit: integer("sheets_per_unit").notNull().default(200),
  unitLabel: text("unit_label").notNull().default("boxes"),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    bytes: bytea("bytes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isMain: boolean("is_main").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const shopSettings = pgTable("shop_settings", {
  id: text("id").primaryKey().default("default"),
  shopName: text("shop_name").notNull().default("Softmill"),
  contactPhone: text("contact_phone").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  facebookUrl: text("facebook_url").notNull().default(""),
  instagramUrl: text("instagram_url").notNull().default(""),
  tiktokUrl: text("tiktok_url").notNull().default(""),
  whatsappUrl: text("whatsapp_url").notNull().default(""),
  xUrl: text("x_url").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: integer("order_number")
      .notNull()
      .unique()
      .default(sql`nextval('order_numbers')`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: orderStatus("status").notNull().default("pending"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending_payment"),
    paymentProvider: text("payment_provider").notNull(),
    paymentReference: text("payment_reference"),
    yocoCheckoutId: text("yoco_checkout_id"),
    subtotalCents: integer("subtotal_cents").notNull(),
    deliveryFeeCents: integer("delivery_fee_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    postalCode: text("postal_code").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_yoco_checkout_id_idx").on(table.yocoCheckoutId),
  ],
);

export const paymentSettings = pgTable("payment_settings", {
  id: text("id").primaryKey().default("default"),
  yocoEnabled: boolean("yoco_enabled").notNull().default(false),
  eftEnabled: boolean("eft_enabled").notNull().default(true),
  yocoPublicKey: text("yoco_public_key").notNull().default(""),
  yocoSecretKey: text("yoco_secret_key").notNull().default(""),
  yocoWebhookSecret: text("yoco_webhook_secret").notNull().default(""),
  bankAccountName: text("bank_account_name").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  bankAccountNumber: text("bank_account_number").notNull().default(""),
  bankBranchCode: text("bank_branch_code").notNull().default(""),
  bankAccountType: text("bank_account_type").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("payment_events_provider_event_id_unique").on(table.provider, table.eventId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    packSize: integer("pack_size").notNull(),
    sheetsPerUnit: integer("sheets_per_unit").notNull(),
    unitLabel: text("unit_label").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    emailStatus: text("email_status").notNull().default("skipped"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ShopSettings = typeof shopSettings.$inferSelect;
export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
