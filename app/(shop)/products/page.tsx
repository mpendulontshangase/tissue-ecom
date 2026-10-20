import { Suspense } from "react";
import { connection } from "next/server";
import { ProductCard } from "@/components/product-card";
import { listActiveProducts } from "@/lib/catalog";

export const metadata = { title: "Shop" };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Tissue cartons</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-bark">
        Both cartons are 2-ply facial tissue, 200 sheets a box. The Household carton of 48 is the lower price per box.
      </p>
      <Suspense fallback={<div className="mt-8 h-80 animate-pulse rounded-3xl bg-sand" />}>
        <Catalog />
      </Suspense>
    </div>
  );
}

async function Catalog() {
  await connection();
  const products = await listActiveProducts();
  if (products.length === 0) {
    return <p className="mt-8 text-bark">Nothing is on the shelf right now.</p>;
  }
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
