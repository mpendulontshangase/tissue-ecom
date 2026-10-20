import { Suspense } from "react";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Owner" };
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Loading the owner desk…</div>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requireAdmin();
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
