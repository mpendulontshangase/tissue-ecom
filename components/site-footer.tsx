import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-pine text-foam">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">Softmill</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-foam/80">
            Facial tissue cartons packed in Johannesburg. Twenty-four or forty-eight boxes at a time, in South African rand.
          </p>
        </div>
        <div className="text-sm leading-7">
          <p className="font-semibold">Shop</p>
          <Link className="block underline-offset-2 hover:underline" href="/products">
            All cartons
          </Link>
          <Link className="block underline-offset-2 hover:underline" href="/cart">
            Cart
          </Link>
          <Link className="block underline-offset-2 hover:underline" href="/account/orders">
            My orders
          </Link>
        </div>
        <div className="text-sm leading-7 text-foam/80">
          <p className="font-semibold text-foam">Payment</p>
          <p>Pay on delivery, or EFT after we confirm the order. No card checkout yet.</p>
        </div>
      </div>
    </footer>
  );
}
