import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { AddToCartForm } from "@/components/add-to-cart-form";
import { getProductBySlug } from "@/lib/catalog";
import { formatZar } from "@/lib/format";

export const metadata = { title: "Carton" };

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-bark">Loading carton…</div>}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.active) notFound();
  const perBox = product.priceCents / product.packSize;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:py-12">
      <div className="overflow-hidden rounded-[2rem] border border-line bg-sand">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={`${product.name}, carton of ${product.packSize}`} className="aspect-square w-full object-cover" />
        ) : (
          <div className="grid aspect-square place-items-center font-serif text-4xl text-pine">Softmill</div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-leaf">
          <Link href="/products" className="hover:underline">
            Shop
          </Link>
          <span aria-hidden="true"> / </span>
          Carton of {product.packSize}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{product.name}</h1>
        <p className="mt-3 text-base leading-7 text-bark">{product.summary}</p>
        <p className="mt-5 font-serif text-4xl">{formatZar(product.priceCents)}</p>
        <p className="text-sm text-bark">
          {formatZar(perBox)} per box · {product.stock} cartons in stock
        </p>
        <p className="mt-4 text-sm leading-6 text-ink">
          1 carton = {product.packSize} {product.unitLabel} ={" "}
          {(product.packSize * product.sheetsPerUnit).toLocaleString("en-ZA")} sheets
        </p>
        <div className="mt-6">
          <AddToCartForm
            productId={product.id}
            max={product.stock}
            packSize={product.packSize}
            sheetsPerUnit={product.sheetsPerUnit}
            unitLabel={product.unitLabel}
            unitPriceCents={product.priceCents}
          />
        </div>
        <p className="mt-8 text-sm leading-7 text-bark">{product.description}</p>
      </div>
    </div>
  );
}
