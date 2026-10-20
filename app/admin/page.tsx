import Link from "next/link";
import { connection } from "next/server";
import { OrderTable } from "@/components/order-table";
import { dashboardStats } from "@/lib/catalog";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { formatZar } from "@/lib/format";

export const metadata = { title: "Overview" };

export default async function AdminHomePage() {
  await connection();
  const stats = await dashboardStats();

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Overview</h1>
      <p className="mt-2 text-sm text-bark">Orders, payment still due, and what has been marked paid.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/orders?status=${status}`}
            className="rounded-2xl border border-line bg-foam p-4"
          >
            <p className="text-xs font-semibold tracking-wide text-bark uppercase">{STATUS_LABELS[status]}</p>
            <p className="mt-1 font-serif text-3xl">{stats.counts[status] ?? 0}</p>
          </Link>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Open order value" value={formatZar(stats.revenueCents)} />
        <Stat label="Pending payment" value={formatZar(stats.pendingPaymentCents)} />
        <Stat label="Marked paid" value={formatZar(stats.collectedCents)} />
      </div>
      <div className="mt-8 flex items-end justify-between gap-3">
        <h2 className="font-serif text-2xl">Recent orders</h2>
        <Link href="/admin/orders" className="text-sm font-semibold text-pine">
          All orders
        </Link>
      </div>
      <div className="mt-4">
        <OrderTable rows={stats.recent} hrefFor={(id) => `/admin/orders/${id}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-pine p-4 text-foam">
      <p className="text-xs font-semibold tracking-wide text-foam/70 uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl sm:text-3xl">{value}</p>
    </div>
  );
}
