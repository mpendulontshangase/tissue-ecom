import { connection } from "next/server";
import { OrderTable } from "@/components/order-table";
import { listOrdersForAdmin } from "@/lib/catalog";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { inputClass } from "@/lib/styles";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const rows = await listOrdersForAdmin({ status: params.status, q: params.q });

  return (
    <div>
      <h1 className="font-serif text-4xl tracking-tight">Orders</h1>
      <form className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]" method="get">
        <label className="block">
          <span className="sr-only">Search</span>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, email, phone, city, or order number"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={params.status ?? ""} className={inputClass}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-12 rounded-full bg-pine px-5 text-sm font-semibold text-foam">Filter</button>
      </form>
      <div className="mt-6">
        <OrderTable rows={rows} hrefFor={(id) => `/admin/orders/${id}`} />
      </div>
    </div>
  );
}
