import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { isUuid } from "@/lib/format";

const servedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const [row] = await getDb()
    .select({ mimeType: productImages.mimeType, bytes: productImages.bytes })
    .from(productImages)
    .where(eq(productImages.id, id))
    .limit(1);

  if (!row || !servedTypes.has(row.mimeType) || row.bytes.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
