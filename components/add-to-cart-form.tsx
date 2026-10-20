"use client";

import { useActionState } from "react";
import { addToCart } from "@/actions/cart";
import { QuantityPicker } from "@/components/quantity-picker";
import { buttonClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function AddToCartForm({
  productId,
  max,
  packSize,
  sheetsPerUnit,
  unitLabel,
  unitPriceCents,
}: {
  productId: string;
  max: number;
  packSize: number;
  sheetsPerUnit: number;
  unitLabel: string;
  unitPriceCents: number;
}) {
  const [state, action, pending] = useActionState(addToCart, initialActionState);

  if (max < 1) {
    return <p className="rounded-2xl bg-sand px-4 py-3 text-sm">Out of stock. Check back soon.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <QuantityPicker
        max={max}
        packSize={packSize}
        sheetsPerUnit={sheetsPerUnit}
        unitLabel={unitLabel}
        unitPriceCents={unitPriceCents}
      />
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Adding…" : "Add cartons to cart"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm font-medium text-leaf">{state.ok}</p> : null}
    </form>
  );
}
