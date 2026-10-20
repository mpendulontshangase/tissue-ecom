import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Loading your account…</div>}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}

async function AccountGate({ children }: { children: React.ReactNode }) {
  await connection();
  await requireUser();
  return children;
}
