"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import type { UserRole } from "@/lib/db/schema";
import { shopMark } from "@/lib/shop-public";

type HeaderUser = { name: string; role: UserRole };

const linkClass =
  "flex min-h-12 items-center rounded-xl px-3 text-base font-semibold text-ink hover:bg-sand";

export function HeaderBar({
  shopName,
  user,
  cartCount,
  unread,
}: {
  shopName: string;
  user: HeaderUser | null;
  cartCount: number;
  unread: number;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/products", label: "Shop" },
    ...(user
      ? [
          { href: "/account/orders", label: "My orders" },
          { href: "/account/notifications", label: unread > 0 ? `Updates (${unread})` : "Updates" },
        ]
      : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Owner" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-serif text-2xl tracking-tight text-pine">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pine text-sm text-foam" aria-hidden>
            {shopMark(shopName)}
          </span>
          <span className="truncate">{shopName}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-sand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sand px-3 text-sm font-semibold text-ink"
          >
            Cart
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-clay px-1.5 text-xs text-foam">
              {cartCount}
            </span>
          </Link>
          {user ? (
            <form action={logoutAction} className="hidden lg:block">
              <button type="submit" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-pine">
                Log out
              </button>
            </form>
          ) : (
            <div className="hidden items-center gap-1 lg:flex">
              <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold">
                Log in
              </Link>
              <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-foam">
                Sign up
              </Link>
            </div>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-foam text-lg lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="border-t border-line bg-foam px-4 py-3 lg:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <form action={logoutAction}>
                  <button type="submit" className={`${linkClass} w-full text-left`}>Log out</button>
                </form>
              ) : (
                <div className="grid gap-1">
                  <Link href="/login" className={linkClass}>
                    Log in
                  </Link>
                  <Link href="/signup" className={linkClass}>
                    Sign up
                  </Link>
                </div>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 font-serif text-2xl text-pine">Shop</div>
    </header>
  );
}
