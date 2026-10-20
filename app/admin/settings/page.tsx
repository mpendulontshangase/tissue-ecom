import { connection } from "next/server";
import { ShopSettingsForm } from "@/components/shop-settings-form";
import { getShopSettings } from "@/lib/settings";

export const metadata = { title: "Shop settings" };

export default async function ShopSettingsPage() {
  await connection();
  const settings = await getShopSettings();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl tracking-tight">Shop settings</h1>
      <p className="mt-2 text-sm leading-6 text-bark">
        The shop name, phone, email, and social links shown in the header, footer, page titles, and contact details.
      </p>
      <div className="mt-6">
        <ShopSettingsForm settings={settings} />
      </div>
    </div>
  );
}
