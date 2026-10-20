import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductForm } from "@/components/product-form";
import { getProductById } from "@/lib/catalog";
import { isUuid } from "@/lib/format";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl tracking-tight">Edit {product.name}</h1>
      {query.created === "1" ? <p className="mt-3 text-sm text-leaf">Product added.</p> : null}
      <div className="mt-6">
        <ProductForm product={product} />
      </div>
    </div>
  );
}
