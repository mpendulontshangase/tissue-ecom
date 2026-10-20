"use client";

import { useActionState } from "react";
import { placeOrder } from "@/actions/checkout";
import { PROVINCES } from "@/lib/constants";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function CheckoutForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(placeOrder, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={labelClass}>Recipient</span>
        <input name="recipientName" defaultValue={defaultName} required className={inputClass} />
        <Field message={state.fieldErrors?.recipientName} />
      </label>
      <label className="block">
        <span className={labelClass}>Phone</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="082 000 0000" className={inputClass} />
        <Field message={state.fieldErrors?.phone} />
      </label>
      <label className="block">
        <span className={labelClass}>Street address</span>
        <input name="line1" autoComplete="address-line1" required className={inputClass} />
        <Field message={state.fieldErrors?.line1} />
      </label>
      <label className="block">
        <span className={labelClass}>Apartment, suite, or business (optional)</span>
        <input name="line2" autoComplete="address-line2" className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>City</span>
          <input name="city" autoComplete="address-level2" required className={inputClass} />
          <Field message={state.fieldErrors?.city} />
        </label>
        <label className="block">
          <span className={labelClass}>Postal code</span>
          <input name="postalCode" inputMode="numeric" autoComplete="postal-code" required className={inputClass} />
          <Field message={state.fieldErrors?.postalCode} />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Province</span>
        <select name="province" defaultValue="" required className={inputClass}>
          <option value="" disabled>
            Choose a province
          </option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
        <Field message={state.fieldErrors?.province} />
      </label>
      <fieldset className="space-y-2 rounded-2xl border border-line bg-sand/60 p-4">
        <legend className="px-1 text-sm font-semibold">Payment</legend>
        <label className="flex min-h-12 items-start gap-3 text-sm leading-6">
          <input type="radio" name="paymentMethod" value="pay_on_delivery" defaultChecked className="mt-1" />
          <span>
            <strong>Pay on delivery.</strong> Have the amount ready for the driver. The order stays pending until it is delivered.
          </span>
        </label>
        <label className="flex min-h-12 items-start gap-3 text-sm leading-6">
          <input type="radio" name="paymentMethod" value="eft" className="mt-1" />
          <span>
            <strong>EFT.</strong> We send banking details when the order is confirmed. Payment stays pending until the owner marks it paid.
          </span>
        </label>
        <Field message={state.fieldErrors?.paymentMethod} />
      </fieldset>
      <label className="block">
        <span className={labelClass}>Notes for delivery (optional)</span>
        <textarea name="notes" rows={3} className={`${inputClass} min-h-28 py-3`} />
        <Field message={state.fieldErrors?.notes} />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}

function Field({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
