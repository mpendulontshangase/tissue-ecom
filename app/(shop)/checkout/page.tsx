import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { readCartDetails } from "@/lib/cart";
import { deliveryFeeCents } from "@/lib/constants";
import { formatZar } from "@/lib/format";
import { redirect } from "next/navigation";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-bark">Loading checkout…</div>}>
      <CheckoutBody />
    </Suspense>
  );
}

async function CheckoutBody() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");
  const lines = await readCartDetails();
  if (lines.length === 0) redirect("/cart");
  const subtotal = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  const fee = deliveryFeeCents(subtotal);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-12">
      <div>
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Checkout</h1>
        <p className="mt-3 text-sm leading-6 text-bark">
          Ordering as {user.email}. Payment stays pending until delivery or until an EFT is marked paid.
        </p>
        <div className="mt-6">
          <CheckoutForm defaultName={user.name} />
        </div>
      </div>
      <aside className="h-fit rounded-3xl border border-line bg-foam p-5">
        <h2 className="font-serif text-2xl">Your cartons</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.map((line) => (
            <li key={line.product.id} className="flex justify-between gap-3">
              <span>
                {line.quantity} × {line.product.name}
                <span className="block text-bark">
                  {line.quantity * line.product.packSize} {line.product.unitLabel}
                </span>
              </span>
              <span className="whitespace-nowrap">{formatZar(line.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{fee === 0 ? "Free" : formatZar(fee)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatZar(subtotal + fee)}</dd>
          </div>
        </dl>
        <Link href="/cart" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-pine">
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
