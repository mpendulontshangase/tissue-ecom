import Link from "next/link";
import { connection } from "next/server";
import { MarkReadOnView } from "@/components/mark-read";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/catalog";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Updates" };

export default async function NotificationsPage() {
  await connection();
  const user = await requireUser("/account/notifications");
  const items = await listNotifications(user.id);
  const unread = items.some((item) => item.readAt === null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <MarkReadOnView enabled={unread} />
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Updates</h1>
      <p className="mt-2 text-sm leading-6 text-bark">
        Messages about your orders stay here, including status changes from the owner.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-line bg-foam p-6 text-bark">
          Nothing yet. When Softmill updates an order, it will show up here.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-3xl border bg-foam p-4 sm:p-5 ${item.readAt ? "border-line" : "border-pine"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{item.title}</h2>
                <time className="text-xs text-bark">{formatWhen(item.createdAt)}</time>
              </div>
              <p className="mt-2 text-sm leading-6">{item.body}</p>
              {item.orderId ? (
                <Link href={`/account/orders/${item.orderId}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-pine">
                  View order
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
