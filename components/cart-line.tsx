"use client";

import { useActionState } from "react";
import { removeCartLine, updateCartLine } from "@/actions/cart";
import { QuantityPicker } from "@/components/quantity-picker";
import { buttonSecondaryClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function CartLineEditor({
  productId,
  quantity,
  max,
  packSize,
  sheetsPerUnit,
  unitLabel,
  unitPriceCents,
}: {
  productId: string;
  quantity: number;
  max: number;
  packSize: number;
  sheetsPerUnit: number;
  unitLabel: string;
  unitPriceCents: number;
}) {
  const [state, action, pending] = useActionState(updateCartLine, initialActionState);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="productId" value={productId} />
        <QuantityPicker
          max={Math.max(max, 1)}
          packSize={packSize}
          sheetsPerUnit={sheetsPerUnit}
          unitLabel={unitLabel}
          unitPriceCents={unitPriceCents}
          defaultValue={quantity}
          compact
        />
        <button type="submit" className={buttonSecondaryClass} disabled={pending}>
          {pending ? "Updating…" : "Update quantity"}
        </button>
        {state.error ? (
          <p role="alert" className="text-sm text-clay">
            {state.error}
          </p>
        ) : null}
      </form>
      <form action={removeCartLine}>
        <input type="hidden" name="productId" value={productId} />
        <button type="submit" className="min-h-11 text-sm font-semibold text-bark underline-offset-2 hover:underline">
          Remove
        </button>
      </form>
    </div>
  );
}
