import { connection } from "next/server";
import { PaymentSettingsForm } from "@/components/payment-settings-form";
import { getPaymentConfig, paymentSettingsView } from "@/lib/payment-config";
import { yocoWebhookUrl } from "@/lib/public-url";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await connection();
  const [config, webhookUrl] = await Promise.all([getPaymentConfig(), yocoWebhookUrl()]);
  const settings = { ...paymentSettingsView(config), webhookUrl };

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl tracking-tight">Payments</h1>
      <p className="mt-2 text-sm leading-6 text-bark">
        Card payments go through Yoco. EFT stays awaiting payment until you mark it paid. Secret keys are encrypted and are not sent back to this page after saving.
      </p>
      <div className="mt-6">
        <PaymentSettingsForm settings={settings} />
      </div>
    </div>
  );
}
