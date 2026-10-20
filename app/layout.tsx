import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { getShopSettings } from "@/lib/settings";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getShopSettings();
  const name = settings.shopName || "Softmill";
  return {
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description: `${name} packs facial tissue into cartons of 24 and 48 boxes. Order in bulk and pay by card with Yoco, or by EFT. Prices in South African rand.`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rubik.variable} h-full`}>
      <body className="min-h-full bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
