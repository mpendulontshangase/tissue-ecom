"use client";

import { useActionState } from "react";
import { markOrderPaid, updateOrder } from "@/actions/admin";
import { toastMessage, useToast } from "@/components/toast";
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
  const push = useToast();
  const [state, action, pending] = useActionState(async (prev: typeof initialActionState, formData: FormData) => {
    const next = await updateOrder(prev, formData);
    const toast = toastMessage(next);
    if (toast) push(toast.kind, toast.message);
    return next;
  }, initialActionState);

  const [paidState, paidAction, paidPending] = useActionState(async (prev: typeof initialActionState, formData: FormData) => {
    const next = await markOrderPaid(prev, formData);
    const toast = toastMessage(next);
    if (toast) push(toast.kind, toast.message);
    return next;
  }, initialActionState);

  return (
    <div className="space-y-4">
    <form action={paidAction} className="space-y-3 rounded-3xl border border-line bg-foam p-4 sm:p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="font-serif text-2xl">Payment</h2>
      {paymentPending ? (
        <>
          <p className="text-sm leading-6 text-bark">Mark the order paid when the EFT arrives, or if you have confirmed a card payment outside the webhook.</p>
          {paidState.error ? (
            <p role="alert" className="text-sm font-medium text-clay">
              {paidState.error}
            </p>
          ) : null}
          <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={paidPending}>
            {paidPending ? "Saving…" : "Mark as paid"}
          </button>
        </>
      ) : (
        <p className="text-sm text-bark">Payment is already marked paid.</p>
      )}
    </form>
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
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-leaf">Order updated. The customer can see it under Notifications.</p>
      ) : null}
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Sending…" : "Save and notify"}
      </button>
      <p className="text-xs leading-5 text-bark">
        The message is always stored for the customer. Email is sent only when RESEND_API_KEY and EMAIL_FROM are set.
      </p>
    </form>
    </div>
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
