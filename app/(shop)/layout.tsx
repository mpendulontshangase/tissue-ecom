import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-24 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-foam focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<footer className="mt-16 h-48 border-t border-line bg-pine" />}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
