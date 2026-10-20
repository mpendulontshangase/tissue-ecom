import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { unreadCount } from "@/lib/catalog";
import { getShopSettings } from "@/lib/settings";
import { HeaderBar, HeaderFallback } from "@/components/header-bar";

export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderSession />
    </Suspense>
  );
}

async function HeaderSession() {
  await connection();
  const [user, count, settings] = await Promise.all([getCurrentUser(), cartCount(), getShopSettings()]);
  const unread = user ? await unreadCount(user.id) : 0;
  return (
    <HeaderBar
      shopName={settings.shopName}
      user={user ? { name: user.name, role: user.role } : null}
      cartCount={count}
      unread={unread}
    />
  );
}
