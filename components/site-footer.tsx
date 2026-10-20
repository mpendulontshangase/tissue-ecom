import Link from "next/link";
import { connection } from "next/server";
import { SocialLinks } from "@/components/social-links";
import { getShopSettings } from "@/lib/settings";

export async function SiteFooter() {
  await connection();
  const settings = await getShopSettings();
  const hasContact = Boolean(settings.contactPhone || settings.contactEmail || settings.facebookUrl || settings.instagramUrl || settings.tiktokUrl || settings.whatsappUrl || settings.xUrl);

  return (
    <footer className="mt-16 border-t border-line bg-pine text-foam">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">{settings.shopName}</p>
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
          {hasContact ? (
            <div className="mt-4 text-foam">
              <p className="font-semibold">Contact</p>
              {settings.contactPhone ? (
                <a className="block underline-offset-2 hover:underline" href={`tel:${settings.contactPhone}`}>
                  {settings.contactPhone}
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a className="block underline-offset-2 hover:underline" href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              ) : null}
              <div className="mt-3">
                <SocialLinks
                  facebookUrl={settings.facebookUrl}
                  instagramUrl={settings.instagramUrl}
                  tiktokUrl={settings.tiktokUrl}
                  whatsappUrl={settings.whatsappUrl}
                  xUrl={settings.xUrl}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
