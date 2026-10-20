"use client";

import { useActionState } from "react";
import { savePaymentSettings } from "@/actions/admin";
import { toastMessage, useToast } from "@/components/toast";
import type { BankDetails } from "@/lib/payment-config";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import { BANK_ACCOUNT_TYPES, initialActionState } from "@/lib/validation";

type View = {
  yocoEnabled: boolean;
  eftEnabled: boolean;
  yocoPublicKey: string;
  yocoPublicSource: "environment" | "saved" | "missing";
  yocoSecretHint: string;
  yocoSecretSource: "environment" | "saved" | "missing";
  secretUnreadable: boolean;
  yocoWebhookHint: string;
  yocoWebhookSource: "environment" | "saved" | "missing";
  webhookUnreadable: boolean;
  mode: "test" | "live" | "unknown";
  bank: BankDetails;
  webhookUrl: string;
};

export function PaymentSettingsForm({ settings }: { settings: View }) {
  const push = useToast();
  const [state, action, pending] = useActionState(async (prev: typeof initialActionState, formData: FormData) => {
    const next = await savePaymentSettings(prev, formData);
    const toast = toastMessage(next);
    if (toast) push(toast.kind, toast.message);
    return next;
  }, initialActionState);

  const modeLabel = settings.mode === "live" ? "Live mode" : settings.mode === "test" ? "Test mode" : "Mode unknown";

  return (
    <form action={action} className="space-y-6">
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}

      <fieldset className="space-y-3 rounded-3xl border border-line bg-foam p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">Methods</legend>
        <p className="text-sm leading-6 text-bark">At least one method must stay enabled. Checkout only shows methods that are ready.</p>
        <label className="flex min-h-12 items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="yocoEnabled" defaultChecked={settings.yocoEnabled} />
          Yoco card payments
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="eftEnabled" defaultChecked={settings.eftEnabled} />
          EFT
        </label>
        <Field message={state.fieldErrors?.eftEnabled} />
      </fieldset>

      <fieldset className="space-y-4 rounded-3xl border border-line bg-foam p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">Yoco</legend>
        <p className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${settings.mode === "live" ? "bg-clay/15 text-clay" : "bg-sand text-ink"}`}>
          {modeLabel}
        </p>
        <p className="text-sm leading-6 text-bark">
          Test keys start with pk_test_ and sk_test_. Live keys start with pk_live_ and sk_live_. The secret key and webhook secret are stored encrypted and are not shown again.
        </p>
        <KeyField
          name="yocoPublicKey"
          label="Public key"
          source={settings.yocoPublicSource}
          hint={settings.yocoPublicKey}
          envName="YOCO_PUBLIC_KEY"
          showValue
          error={state.fieldErrors?.yocoPublicKey}
        />
        <KeyField
          name="yocoSecretKey"
          label="Secret key"
          source={settings.yocoSecretSource}
          hint={settings.yocoSecretHint}
          envName="YOCO_SECRET_KEY"
          unreadable={settings.secretUnreadable}
          error={state.fieldErrors?.yocoSecretKey}
        />
        <KeyField
          name="yocoWebhookSecret"
          label="Webhook secret"
          source={settings.yocoWebhookSource}
          hint={settings.yocoWebhookHint}
          envName="YOCO_WEBHOOK_SECRET"
          unreadable={settings.webhookUnreadable}
          error={state.fieldErrors?.yocoWebhookSecret}
        />
        {!settings.yocoWebhookHint && settings.yocoWebhookSource !== "environment" ? (
          <p className="text-sm text-bark">Without a webhook secret, card payments stay awaiting payment until a verified Yoco confirmation arrives.</p>
        ) : null}
        <label className="block">
          <span className={labelClass}>Webhook URL</span>
          <input readOnly value={settings.webhookUrl} className={inputClass} />
          <span className="mt-1 block text-sm text-bark">Paste this into the Yoco webhook registration. It must be a public https address. Yoco cannot call localhost.</span>
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-3xl border border-line bg-foam p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">EFT bank account</legend>
        <label className="block">
          <span className={labelClass}>Account holder</span>
          <input name="bankAccountName" defaultValue={settings.bank.accountName} className={inputClass} />
          <Field message={state.fieldErrors?.bankAccountName} />
        </label>
        <label className="block">
          <span className={labelClass}>Bank</span>
          <input name="bankName" defaultValue={settings.bank.bankName} className={inputClass} />
          <Field message={state.fieldErrors?.bankName} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Account number</span>
            <input name="bankAccountNumber" inputMode="numeric" defaultValue={settings.bank.accountNumber} className={inputClass} />
            <Field message={state.fieldErrors?.bankAccountNumber} />
          </label>
          <label className="block">
            <span className={labelClass}>Branch code</span>
            <input name="bankBranchCode" inputMode="numeric" defaultValue={settings.bank.branchCode} className={inputClass} />
            <Field message={state.fieldErrors?.bankBranchCode} />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Account type</span>
          <select name="bankAccountType" defaultValue={settings.bank.accountType} className={inputClass}>
            <option value="">Choose a type</option>
            {BANK_ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Field message={state.fieldErrors?.bankAccountType} />
        </label>
      </fieldset>

      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Saving…" : "Save payment settings"}
      </button>
    </form>
  );
}

function KeyField({
  name,
  label,
  source,
  hint,
  envName,
  showValue = false,
  unreadable = false,
  error,
}: {
  name: string;
  label: string;
  source: "environment" | "saved" | "missing";
  hint: string;
  envName: string;
  showValue?: boolean;
  unreadable?: boolean;
  error?: string;
}) {
  if (source === "environment") {
    return (
      <p className="text-sm leading-6">
        <span className="font-medium">{label}.</span> Using {envName}
        {hint ? ` (${showValue ? hint : hint})` : ""}. Remove that variable to edit it here.
      </p>
    );
  }
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        name={name}
        type={showValue ? "text" : "password"}
        autoComplete="off"
        defaultValue={showValue ? hint : ""}
        placeholder={hint ? `Saved ${hint}. Leave blank to keep it.` : "Not saved yet"}
        className={inputClass}
      />
      {unreadable ? <span className="mt-1 block text-sm text-clay">The saved value could not be read. Enter it again.</span> : null}
      <Field message={error} />
    </label>
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
