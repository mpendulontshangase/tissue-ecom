"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-pine text-foam lg:flex lg:min-h-screen lg:flex-col lg:p-6">
        <Link href="/admin" className="font-serif text-2xl">
          Softmill
        </Link>
        <p className="mt-1 text-sm text-foam/70">Owner</p>
        <nav className="mt-8 grid gap-1" aria-label="Owner">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10">
              {link.label}
            </Link>
          ))}
          <Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10">
            View shop
          </Link>
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button type="submit" className="min-h-11 text-sm font-semibold text-foam/80">Log out</button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-foam"
            aria-expanded={open}
            aria-controls="admin-nav"
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            <span className="sr-only">{open ? "Close owner menu" : "Open owner menu"}</span>
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
          <div className="min-w-0">
            <p className="font-serif text-xl leading-none text-pine">Softmill</p>
            <p className="truncate text-xs text-bark">{name}</p>
          </div>
        </header>
        {open ? (
          <nav id="admin-nav" className="border-b border-line bg-foam px-4 py-3 lg:hidden" aria-label="Owner mobile">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex min-h-12 items-center rounded-xl px-3 font-semibold">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/" className="flex min-h-12 items-center rounded-xl px-3 font-semibold">
                  View shop
                </Link>
              </li>
              <li>
                <form action={logoutAction}>
                  <button type="submit" className="flex min-h-12 w-full items-center rounded-xl px-3 text-left font-semibold">Log out</button>
                </form>
              </li>
            </ul>
          </nav>
        ) : null}
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
