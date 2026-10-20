import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { hashPassword } from "../lib/password";
import { paymentSettings, productImages, products, shopSettings, users } from "../lib/db/schema";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const seedProducts = [
  {
    slug: "everyday-24",
    name: "Everyday Carton",
    summary: "A carton of 24 boxes for the house, the car, and the spare room.",
    description:
      "Two-ply facial tissue, 200 sheets in every box. The Everyday carton holds 24 boxes — 4,800 sheets — which is a practical top-up for a family or a small office. Order several cartons if you are stocking a guest house or a clinic waiting room.",
    packSize: 24,
    sheetsPerUnit: 200,
    unitLabel: "boxes",
    priceCents: 18900,
    stock: 400,
    imageUrl: "/products/everyday-24.svg",
    active: true,
    sortOrder: 1,
  },
  {
    slug: "household-48",
    name: "Household Carton",
    summary: "A carton of 48 boxes when one cupboard is not enough.",
    description:
      "The same 2-ply facial tissue, packed 48 boxes to a carton — 9,600 sheets. It is the better-value buy for busy households, salons, and offices that prefer fewer deliveries. Quantity can run into the dozens of cartons.",
    packSize: 48,
    sheetsPerUnit: 200,
    unitLabel: "boxes",
    priceCents: 34900,
    stock: 250,
    imageUrl: "/products/household-48.svg",
    active: true,
    sortOrder: 2,
  },
];

async function seed(db: ReturnType<typeof drizzle>) {
  for (const product of seedProducts) {
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, product.slug))
      .limit(1);

    let productId = existing?.id;
    if (existing) {
      await db
        .update(products)
        .set({
          name: product.name,
          summary: product.summary,
          description: product.description,
          packSize: product.packSize,
          sheetsPerUnit: product.sheetsPerUnit,
          unitLabel: product.unitLabel,
          sortOrder: product.sortOrder,
        })
        .where(eq(products.id, existing.id));
    } else {
      const [created] = await db.insert(products).values(product).returning({ id: products.id });
      productId = created?.id;
    }

    if (!productId) continue;
    const [image] = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(1);
    if (image) continue;

    const filePath = path.join(process.cwd(), "public", "products", `${product.slug}.svg`);
    const bytes = await readFile(filePath);
    await db.insert(productImages).values({
      productId,
      mimeType: "image/svg+xml",
      bytes,
      sortOrder: 0,
      isMain: true,
    });
  }

  const [settings] = await db
    .select({ id: shopSettings.id })
    .from(shopSettings)
    .where(eq(shopSettings.id, "default"))
    .limit(1);
  if (!settings) {
    await db.insert(shopSettings).values({ id: "default", shopName: "Softmill" });
  }

  const [payments] = await db
    .select({ id: paymentSettings.id })
    .from(paymentSettings)
    .where(eq(paymentSettings.id, "default"))
    .limit(1);
  if (!payments) {
    await db.insert(paymentSettings).values({ id: "default", eftEnabled: true, yocoEnabled: false });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD are unset. Skipping owner account.");
    return;
  }
  if (!email || !password) {
    console.warn("Set both ADMIN_EMAIL and ADMIN_PASSWORD to create the owner account.");
    return;
  }
  if (password.length < 8) {
    console.warn("ADMIN_PASSWORD must be at least 8 characters. Owner account was not changed.");
    return;
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const resetPassword = process.env.SEED_RESET_ADMIN_PASSWORD === "true";

  if (!existingUser) {
    await db.insert(users).values({
      email,
      name: "Softmill owner",
      passwordHash: await hashPassword(password),
      role: "admin",
    });
    console.log(`Created owner account for ${email}`);
    return;
  }

  await db
    .update(users)
    .set({
      role: "admin",
      ...(resetPassword ? { passwordHash: await hashPassword(password) } : {}),
    })
    .where(eq(users.id, existingUser.id));

  console.log(
    existingUser.role === "admin"
      ? `Owner account ${email} already exists`
      : `Promoted ${email} to owner`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL is not set. Skipping migrations and seed.");
    return;
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : "require",
  });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: "./drizzle" });
  await seed(db);
  await sql.end();
  console.log("Database is migrated and seeded.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
