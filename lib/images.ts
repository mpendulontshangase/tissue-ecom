import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productImages } from "@/lib/db/schema";

export async function mainImageMap(productIds: string[]) {
  const map = new Map<string, string>();
  if (productIds.length === 0) return map;
  const rows = await getDb()
    .select({
      id: productImages.id,
      productId: productImages.productId,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(desc(productImages.isMain), asc(productImages.sortOrder));
  for (const row of rows) {
    if (!map.has(row.productId)) map.set(row.productId, row.id);
  }
  return map;
}

export async function listProductImageMeta(productId: string) {
  return getDb()
    .select({
      id: productImages.id,
      isMain: productImages.isMain,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), desc(productImages.isMain));
}
