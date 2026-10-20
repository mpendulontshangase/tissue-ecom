import Link from "next/link";
import { Suspense } from "react";
import { getShopSettings } from "@/lib/settings";

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20">
          <h1 className="font-serif text-4xl">That page is not on the shelf.</h1>
        </div>
      }
    >
      <NotFoundBody />
    </Suspense>
  );
}

async function NotFoundBody() {
  const settings = await getShopSettings();
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-serif text-4xl">That page is not on the shelf.</h1>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center font-semibold text-pine">
        Back to {settings.shopName}
      </Link>
    </div>
  );
}
