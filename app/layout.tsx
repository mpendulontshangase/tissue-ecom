import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Softmill",
    template: "%s · Softmill",
  },
  description:
    "Softmill packs facial tissue into cartons of 24 and 48 boxes. Order in bulk and pay on delivery or by EFT. Prices in South African rand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
