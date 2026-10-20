"use client";

import { useState } from "react";
import { deleteProduct } from "@/actions/admin";
import { TrashIcon } from "@/components/icons";
import { buttonClass, buttonSecondaryClass } from "@/lib/styles";

export function DeleteProductButton({
  id,
  name,
  orderCount,
}: {
  id: string;
  name: string;
  orderCount: number;
}) {
  const [open, setOpen] = useState(false);
  const archives = orderCount > 0;
  const ordersLabel = orderCount === 1 ? "1 order" : `${orderCount} orders`;

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-foam text-clay"
        aria-label={`Delete ${name}`}
        onClick={() => setOpen(true)}
      >
        <TrashIcon />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-4 sm:place-items-center" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-3xl bg-foam p-5 shadow-xl">
            <h2 id="delete-title" className="font-serif text-2xl tracking-tight">
              {archives ? `Archive ${name}?` : `Delete ${name}?`}
            </h2>
            {archives ? (
              <p className="mt-3 text-sm leading-6 text-bark">
                This product is on {ordersLabel}. It will be archived and hidden from the shop. Those orders keep the product name, pack, price, and quantity. Nothing in the order history is removed.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-bark">
                This product is not on any order. Deleting it removes the product and its pictures permanently.
              </p>
            )}
            <form action={deleteProduct} className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <input type="hidden" name="id" value={id} />
              <button type="button" className={buttonSecondaryClass} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={buttonClass}>
                {archives ? "Archive product" : "Delete product"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
