import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/settings";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getShopSettings();
  const name = settings.shopName || "Softmill";
  return {
    title: {
      default: `Owner · ${name}`,
      template: `%s · ${name}`,
    },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Loading the owner desk…</div>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  const [user, settings] = await Promise.all([requireAdmin(), getShopSettings()]);
  return (
    <AdminShell name={user.name} shopName={settings.shopName}>
      {children}
    </AdminShell>
  );
}
