import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { asc, inArray } from "drizzle-orm";
import { CART_COOKIE } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { products, type Product } from "@/lib/db/schema";

export type CartLine = {
  productId: string;
  quantity: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const readCart = cache(async (): Promise<CartLine[]> => {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const lines: CartLine[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const productId = "productId" in entry ? String(entry.productId) : "";
      const quantity = "quantity" in entry ? Number(entry.quantity) : 0;
      if (!uuidPattern.test(productId)) continue;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) continue;
      const existing = lines.find((line) => line.productId === productId);
      if (existing) existing.quantity = Math.min(9999, existing.quantity + quantity);
      else lines.push({ productId, quantity });
    }
    return lines;
  } catch {
    return [];
  }
});

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export type CartDetail = {
  product: Product;
  quantity: number;
  lineTotalCents: number;
};

export async function readCartDetails() {
  const lines = await readCart();
  if (lines.length === 0) return [];

  const rows = await getDb()
    .select()
    .from(products)
    .where(
      inArray(
        products.id,
        lines.map((line) => line.productId),
      ),
    )
    .orderBy(asc(products.sortOrder));

  const byId = new Map(rows.map((product) => [product.id, product]));
  const details: CartDetail[] = [];
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) continue;
    details.push({
      product,
      quantity: line.quantity,
      lineTotalCents: product.priceCents * line.quantity,
    });
  }
  return details;
}

export async function cartCount() {
  const lines = await readCart();
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
