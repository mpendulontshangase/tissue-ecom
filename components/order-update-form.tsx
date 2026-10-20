"use client";

import { useActionState } from "react";
import { updateOrder } from "@/actions/admin";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@/lib/db/schema";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function OrderUpdateForm({
  orderId,
  status,
  paymentPending,
}: {
  orderId: string;
  status: OrderStatus;
  paymentPending: boolean;
}) {
  const [state, action, pending] = useActionState(updateOrder, initialActionState);

  return (
    <form action={action} className="space-y-4 rounded-3xl border border-line bg-foam p-4 sm:p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="font-serif text-2xl">Update the customer</h2>
      <label className="block">
        <span className={labelClass}>Status</span>
        <select name="status" defaultValue={status} className={inputClass}>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Message</span>
        <textarea
          name="message"
          rows={4}
          placeholder="Your cartons leave tomorrow morning."
          className={`${inputClass} min-h-28 py-3`}
        />
        <Error message={state.fieldErrors?.message} />
      </label>
      {paymentPending ? (
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" name="markPaid" />
          Mark EFT or delivery payment as received
        </label>
      ) : (
        <p className="text-sm text-bark">Payment is already marked paid.</p>
      )}
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm font-medium text-leaf">{state.ok}</p> : null}
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Sending…" : "Save and notify"}
      </button>
      <p className="text-xs leading-5 text-bark">
        The message is always stored for the customer. Email is sent only when RESEND_API_KEY and EMAIL_FROM are set.
      </p>
    </form>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
