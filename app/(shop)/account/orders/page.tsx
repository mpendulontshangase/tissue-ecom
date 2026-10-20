import Link from "next/link";
import { connection } from "next/server";
import { OrderTable } from "@/components/order-table";
import { requireUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/catalog";
import { buttonClass } from "@/lib/styles";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  await connection();
  const user = await requireUser("/account/orders");
  const rows = await listOrdersForUser(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">My orders</h1>
      <p className="mt-2 text-sm text-bark">Status changes from Softmill show here and under Updates.</p>
      {rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-foam p-6">
          <p>You have not ordered yet.</p>
          <Link href="/products" className={`${buttonClass} mt-4`}>
            Shop cartons
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <OrderTable rows={rows} hrefFor={(id) => `/account/orders/${id}`} />
        </div>
      )}
    </div>
  );
}
