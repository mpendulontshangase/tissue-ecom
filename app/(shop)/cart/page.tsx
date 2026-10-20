import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CartLineEditor } from "@/components/cart-line";
import { readCartDetails } from "@/lib/cart";
import { deliveryFeeCents } from "@/lib/constants";
import { formatZar } from "@/lib/format";
import { buttonClass } from "@/lib/styles";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-bark">Loading cart…</div>}>
      <CartBody />
    </Suspense>
  );
}

async function CartBody() {
  await connection();
  const lines = await readCartDetails();
  const subtotal = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  const fee = lines.length ? deliveryFeeCents(subtotal) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Cart</h1>
      {lines.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-foam p-6">
          <p className="text-bark">Your cart is empty.</p>
          <Link href="/products" className={`${buttonClass} mt-4`}>
            Shop cartons
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ul className="space-y-4">
            {lines.map((line) => (
              <li key={line.product.id} className="rounded-3xl border border-line bg-foam p-4 sm:p-5">
                <div className="flex gap-4">
                  {line.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.product.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl">
                      <Link href={`/products/${line.product.slug}`}>{line.product.name}</Link>
                    </h2>
                    <p className="text-sm text-bark">
                      Carton of {line.product.packSize} · {formatZar(line.product.priceCents)} each
                    </p>
                    {!line.product.active ? <p className="text-sm text-clay">This carton is no longer for sale.</p> : null}
                    {line.quantity > line.product.stock ? (
                      <p className="text-sm text-clay">Only {line.product.stock} cartons are left. Lower the quantity.</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4">
                  <CartLineEditor
                    productId={line.product.id}
                    quantity={line.quantity}
                    max={line.product.stock}
                    packSize={line.product.packSize}
                    sheetsPerUnit={line.product.sheetsPerUnit}
                    unitLabel={line.product.unitLabel}
                    unitPriceCents={line.product.priceCents}
                  />
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-3xl border border-line bg-foam p-5">
            <h2 className="font-serif text-2xl">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Subtotal</dt>
                <dd>{formatZar(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Delivery</dt>
                <dd>{fee === 0 ? "Free" : formatZar(fee)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatZar(subtotal + fee)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-bark">Delivery is R85, and free from R800. You pay on delivery or by EFT.</p>
            <Link href="/checkout" className={`${buttonClass} mt-5 w-full`}>
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
