import Link from "next/link";
import { connection } from "next/server";
import { listAllProducts } from "@/lib/catalog";
import { formatZar } from "@/lib/format";
import { buttonClass } from "@/lib/styles";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await connection();
  const products = await listAllProducts();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Products</h1>
          <p className="mt-2 text-sm text-bark">Price, stock, image, and whether a carton is on the shop.</p>
        </div>
        <Link href="/admin/products/new" className={`${buttonClass} w-full sm:w-auto`}>
          Add product
        </Link>
      </div>
      <ul className="mt-6 space-y-3 lg:hidden">
        {products.map((product) => (
          <li key={product.id} className="rounded-2xl border border-line bg-foam p-4">
            <div className="flex gap-3">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-bark">
                  {product.packSize} boxes · {formatZar(product.priceCents)} · {product.stock} in stock
                </p>
                <p className="text-sm">{product.active ? "Active" : "Hidden"}</p>
              </div>
            </div>
            <Link href={`/admin/products/${product.id}/edit`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-pine">
              Edit
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-foam lg:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line text-bark">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Pack</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Shop</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3 font-semibold">{product.name}</td>
                <td className="px-4 py-3">{product.packSize}</td>
                <td className="px-4 py-3">{formatZar(product.priceCents)}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3">{product.active ? "Active" : "Hidden"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${product.id}/edit`} className="font-semibold text-pine">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
