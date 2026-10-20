import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { shopSettings, type ShopSettings } from "@/lib/db/schema";

export const fallbackShopSettings: ShopSettings = {
  id: "default",
  shopName: "Softmill",
  contactPhone: "",
  contactEmail: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  whatsappUrl: "",
  xUrl: "",
  updatedAt: new Date(0),
};

export async function getShopSettings() {
  if (!process.env.DATABASE_URL) return fallbackShopSettings;
  const [row] = await getDb().select().from(shopSettings).where(eq(shopSettings.id, "default")).limit(1);
  return row ?? fallbackShopSettings;
}
