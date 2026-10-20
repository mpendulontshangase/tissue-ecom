import Link from "next/link";
import type { Product } from "@/lib/db/schema";
import { formatZar } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const perBox = product.priceCents / product.packSize;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-foam shadow-sm">
      <Link href={`/products/${product.slug}`} className="block bg-sand">
        {product.imageUrl ? (
          // Product art is an SVG or an owner-supplied URL, including data URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="aspect-[5/4] w-full object-cover" />
        ) : (
          <div className="grid aspect-[5/4] place-items-center font-serif text-3xl text-pine">Softmill</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-leaf uppercase">
          Carton of {product.packSize}
        </p>
        <h2 className="mt-1 font-serif text-3xl tracking-tight">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <p className="mt-2 text-sm leading-6 text-bark">{product.summary}</p>
        <p className="mt-4 text-sm text-bark">
          {product.packSize} {product.unitLabel} · {(product.packSize * product.sheetsPerUnit).toLocaleString("en-ZA")} sheets
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="font-serif text-2xl">{formatZar(product.priceCents)}</p>
            <p className="text-xs text-bark">{formatZar(perBox)} / box</p>
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-foam"
          >
            Order
          </Link>
        </div>
      </div>
    </article>
  );
}
