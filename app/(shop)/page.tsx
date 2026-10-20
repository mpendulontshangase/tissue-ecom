import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ProductCard } from "@/components/product-card";
import { listActiveProducts } from "@/lib/catalog";
import { buttonClass, buttonSecondaryClass } from "@/lib/styles";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-leaf uppercase">Johannesburg · facial tissue</p>
          <h1 className="mt-3 max-w-xl font-serif text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl">
            Cartons of tissue, ready when the box runs out.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-bark sm:text-lg">
            Softmill packs 2-ply facial tissue into cartons of 24 and 48 boxes. Order one carton or a storeroom’s worth. Pay the driver, or pay by EFT once we confirm.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={`${buttonClass} w-full sm:w-auto`}>
              Shop cartons
            </Link>
            <Link href="/products#bulk" className={`${buttonSecondaryClass} w-full sm:w-auto`}>
              See bulk quantities
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[2rem] border border-line bg-foam p-4 shadow-sm sm:p-6">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-sand" />}>
              <HeroCartons />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Two carton sizes</h2>
          <Link href="/products" className="hidden text-sm font-semibold text-pine sm:inline">
            View both
          </Link>
        </div>
        <Suspense fallback={<div className="mt-6 h-80 animate-pulse rounded-3xl bg-sand" />}>
          <ProductGrid />
        </Suspense>
      </section>

      <section id="bulk" className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-4 rounded-[2rem] bg-pine px-5 py-8 text-foam sm:px-8 lg:grid-cols-3">
          <div>
            <h2 className="font-serif text-3xl">Bulk is just a quantity</h2>
            <p className="mt-3 text-sm leading-6 text-foam/80">
              The selector counts cartons, then shows the boxes and sheets inside. Type a large number or tap 10, 20, or 50.
            </p>
          </div>
          <p className="rounded-2xl bg-white/10 p-4 text-sm leading-6">
            <strong className="block font-serif text-2xl">10 × 24</strong>
            10 Everyday cartons are 240 boxes and 48,000 sheets.
          </p>
          <p className="rounded-2xl bg-white/10 p-4 text-sm leading-6">
            <strong className="block font-serif text-2xl">10 × 48</strong>
            10 Household cartons are 480 boxes and 96,000 sheets.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
        {[
          ["1", "Choose the carton", "24 boxes or 48. Add as many cartons as you have room for."],
          ["2", "Tell us where", "A delivery address and phone number. Notes if a guard or reception must sign."],
          ["3", "Pay when it is real", "Pay on delivery, or EFT after we confirm. Nothing is charged online."],
        ].map(([step, title, copy]) => (
          <article key={step} className="rounded-3xl border border-line bg-foam p-5">
            <p className="font-serif text-3xl text-clay">{step}</p>
            <h3 className="mt-2 font-serif text-2xl">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-bark">{copy}</p>
          </article>
        ))}
      </section>
    </>
  );
}

async function HeroCartons() {
  await connection();
  const products = await listActiveProducts();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <li key={product.id} className="overflow-hidden rounded-2xl bg-sand">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="aspect-square w-full object-cover" />
          ) : null}
          <p className="px-3 py-3 text-sm font-semibold">
            {product.packSize} boxes
          </p>
        </li>
      ))}
    </ul>
  );
}

async function ProductGrid() {
  await connection();
  const products = await listActiveProducts();
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
