"use server";

import { revalidatePath } from "next/cache";
import { getProductById, isForSale } from "@/lib/catalog";
import { readCart, writeCart } from "@/lib/cart";
import { quantitySchema, type ActionState } from "@/lib/validation";

function refreshShop() {
  revalidatePath("/", "layout");
}

export async function addToCart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const preset = formData.get("preset");
  const parsed = quantitySchema.safeParse(preset || formData.get("quantity"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a quantity" };

  const product = await getProductById(productId);
  if (!product || !isForSale(product)) return { error: "That carton is not available." };
  if (product.stock < 1) return { error: "That carton is out of stock." };

  const lines = await readCart();
  const existing = lines.find((line) => line.productId === product.id);
  const nextQuantity = (existing?.quantity ?? 0) + parsed.data;
  if (nextQuantity > product.stock) {
    return { error: `Only ${product.stock} cartons are in stock.` };
  }

  const next = existing
    ? lines.map((line) =>
        line.productId === product.id ? { ...line, quantity: nextQuantity } : line,
      )
    : [...lines, { productId: product.id, quantity: parsed.data }];

  await writeCart(next);
  refreshShop();
  return { ok: `Added ${parsed.data} carton${parsed.data === 1 ? "" : "s"} to your cart.` };
}

export async function updateCartLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const parsed = quantitySchema.safeParse(formData.get("quantity"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a quantity" };

  const product = await getProductById(productId);
  if (!product) return { error: "That carton is no longer listed." };
  if (parsed.data > product.stock) return { error: `Only ${product.stock} cartons are in stock.` };

  const lines = await readCart();
  await writeCart(
    lines.map((line) => (line.productId === productId ? { ...line, quantity: parsed.data } : line)),
  );
  refreshShop();
  return { ok: "Cart updated." };
}

export async function removeCartLine(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const lines = await readCart();
  await writeCart(lines.filter((line) => line.productId !== productId));
  refreshShop();
}
