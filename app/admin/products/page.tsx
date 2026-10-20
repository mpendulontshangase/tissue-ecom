import Link from "next/link";
import { connection } from "next/server";
import { DeleteProductButton } from "@/components/delete-product-button";
import { FlashToast } from "@/components/flash-toast";
import { PencilIcon } from "@/components/icons";
import { NoImage } from "@/components/no-image";
import { listProductsForAdmin } from "@/lib/catalog";
import { formatZar } from "@/lib/format";
import { productImageSrc } from "@/lib/image-limits";
import { buttonClass } from "@/lib/styles";

export const metadata = { title: "Products" };

const notices: Record<string, string> = {
  archived: "Product archived. It is hidden from the shop and order history is unchanged.",
  deleted: "Product deleted.",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const products = await listProductsForAdmin();
  const live = products.filter((product) => !product.archivedAt);
  const archived = products.filter((product) => product.archivedAt);
  const notice = query.notice ? notices[query.notice] : undefined;

  return (
    <div>
      <FlashToast message={notice} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bark">
            Edit is the pencil on the left. Delete is the trash can on the right. If a product is already on an order, delete archives it instead of erasing it, so those orders stay intact.
          </p>
        </div>
        <Link href="/admin/products/new" className={`${buttonClass} w-full sm:w-auto`}>
          Add product
        </Link>
      </div>
      {notice ? <p className="mt-4 rounded-xl bg-sand px-3 py-2 text-sm text-ink">{notice}</p> : null}
      <ProductRows products={live} />
      {archived.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Archived</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-bark">
            These products are hidden from the shop because orders still refer to them. The order history keeps the original name, pack, and price.
          </p>
          <ProductRows products={archived} archived />
        </section>
      ) : null}
    </div>
  );
}

function ProductRows({
  products,
  archived = false,
}: {
  products: Awaited<ReturnType<typeof listProductsForAdmin>>;
  archived?: boolean;
}) {
  if (products.length === 0) {
    return <p className="mt-6 text-sm text-bark">No products in this list.</p>;
  }

  return (
    <>
      <ul className="mt-6 space-y-3 lg:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex items-start gap-2 rounded-2xl border border-line bg-foam p-3">
            <EditLink id={product.id} name={product.name} />
            <div className="flex min-w-0 flex-1 gap-3">
              <ProductThumb product={product} />
              <div className="min-w-0">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-bark">
                  {product.packSize} boxes · {formatZar(product.priceCents)} · {product.stock} in stock
                </p>
                <ShopState product={product} />
              </div>
            </div>
            {archived ? <ArchivedMark /> : <DeleteProductButton id={product.id} name={product.name} orderCount={product.orderCount} />}
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-foam lg:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-bark">
            <tr>
              <th className="px-3 py-3 font-medium">
                <span className="sr-only">Edit</span>
              </th>
              <th className="px-3 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Pack</th>
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Shop</th>
              <th className="px-3 py-3 text-right font-medium">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-3">
                  <EditLink id={product.id} name={product.name} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb product={product} />
                    <span className="font-semibold">{product.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">{product.packSize}</td>
                <td className="px-3 py-3">{formatZar(product.priceCents)}</td>
                <td className="px-3 py-3">{product.stock}</td>
                <td className="px-3 py-3">
                  <ShopState product={product} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end">
                    {archived ? <ArchivedMark /> : <DeleteProductButton id={product.id} name={product.name} orderCount={product.orderCount} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EditLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/admin/products/${id}/edit`}
      aria-label={`Edit ${name}`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-sand text-pine"
    >
      <PencilIcon />
    </Link>
  );
}

function ProductThumb({ product }: { product: { mainImageId: string | null; name: string } }) {
  if (!product.mainImageId) return <NoImage className="h-14 w-14 shrink-0 rounded-xl" label={`No image for ${product.name}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={productImageSrc(product.mainImageId)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
  );
}

function ShopState({ product }: { product: { active: boolean; archivedAt: Date | null } }) {
  if (product.archivedAt) return <p className="text-sm font-medium text-clay">Archived</p>;
  return <p className="text-sm">{product.active ? "Active" : "Hidden"}</p>;
}

function ArchivedMark() {
  return <span className="inline-flex h-11 items-center text-xs font-semibold text-bark">Archived</span>;
}
