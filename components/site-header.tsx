import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { unreadCount } from "@/lib/catalog";
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
  const [user, count] = await Promise.all([getCurrentUser(), cartCount()]);
  const unread = user ? await unreadCount(user.id) : 0;
  return (
    <HeaderBar
      user={user ? { name: user.name, role: user.role } : null}
      cartCount={count}
      unread={unread}
    />
  );
}
