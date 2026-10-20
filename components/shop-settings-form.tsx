"use client";

import { useActionState } from "react";
import { saveShopSettings } from "@/actions/admin";
import { toastMessage, useToast } from "@/components/toast";
import type { ShopSettings } from "@/lib/db/schema";
import { inputClass, labelClass, buttonClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

const fields = [
  ["facebookUrl", "Facebook", "https://facebook.com/your-page"],
  ["instagramUrl", "Instagram", "https://instagram.com/your-shop"],
  ["tiktokUrl", "TikTok", "https://www.tiktok.com/@your-shop"],
  ["whatsappUrl", "WhatsApp", "082 000 0000 or https://wa.me/27820000000"],
  ["xUrl", "X", "https://x.com/your-shop"],
] as const;

export function ShopSettingsForm({ settings }: { settings: ShopSettings }) {
  const push = useToast();
  const [state, action, pending] = useActionState(async (prev: typeof initialActionState, formData: FormData) => {
    const next = await saveShopSettings(prev, formData);
    const toast = toastMessage(next);
    if (toast) push(toast.kind, toast.message);
    return next;
  }, initialActionState);

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <label className="block">
        <span className={labelClass}>Shop name</span>
        <input name="shopName" required defaultValue={settings.shopName} className={inputClass} />
        <FieldError message={state.fieldErrors?.shopName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Contact phone</span>
          <input name="contactPhone" inputMode="tel" defaultValue={settings.contactPhone} placeholder="082 000 0000" className={inputClass} />
          <FieldError message={state.fieldErrors?.contactPhone} />
        </label>
        <label className="block">
          <span className={labelClass}>Contact email</span>
          <input name="contactEmail" type="email" defaultValue={settings.contactEmail} placeholder="hello@example.com" className={inputClass} />
          <FieldError message={state.fieldErrors?.contactEmail} />
        </label>
      </div>
      <fieldset className="space-y-4">
        <legend className={labelClass}>Social links</legend>
        <p className="text-sm leading-6 text-bark">Leave a link blank to hide its icon on the shop. Use https:// links. WhatsApp can also be a phone number.</p>
        {fields.map(([name, label, placeholder]) => (
          <label key={name} className="block">
            <span className={labelClass}>{label}</span>
            <input name={name} defaultValue={settings[name]} placeholder={placeholder} className={inputClass} />
            <FieldError message={state.fieldErrors?.[name]} />
          </label>
        ))}
      </fieldset>
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Saving…" : "Save shop settings"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
