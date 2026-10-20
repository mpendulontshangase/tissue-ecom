"use client";

import { useActionState } from "react";
import { saveProduct } from "@/actions/admin";
import type { Product } from "@/lib/db/schema";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, initialActionState);
  const price = product ? (product.priceCents / 100).toFixed(2) : "";
  const imageIsUpload = product?.imageUrl?.startsWith("data:") ?? false;

  return (
    <form action={action} className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {state.ok ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{state.ok}</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <label className="block">
        <span className={labelClass}>Name</span>
        <input name="name" required defaultValue={product?.name ?? ""} className={inputClass} />
        <Error message={state.fieldErrors?.name} />
      </label>
      <label className="block">
        <span className={labelClass}>URL slug</span>
        <input name="slug" defaultValue={product?.slug ?? ""} placeholder="everyday-24" className={inputClass} />
        <Error message={state.fieldErrors?.slug} />
      </label>
      <label className="block">
        <span className={labelClass}>Summary</span>
        <input name="summary" required defaultValue={product?.summary ?? ""} className={inputClass} />
        <Error message={state.fieldErrors?.summary} />
      </label>
      <label className="block">
        <span className={labelClass}>Description</span>
        <textarea name="description" required rows={5} defaultValue={product?.description ?? ""} className={`${inputClass} min-h-36 py-3`} />
        <Error message={state.fieldErrors?.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Boxes per carton</span>
          <input name="packSize" type="number" min={1} required defaultValue={product?.packSize ?? 24} className={inputClass} />
          <Error message={state.fieldErrors?.packSize} />
        </label>
        <label className="block">
          <span className={labelClass}>Sheets per box</span>
          <input name="sheetsPerUnit" type="number" min={1} required defaultValue={product?.sheetsPerUnit ?? 200} className={inputClass} />
          <Error message={state.fieldErrors?.sheetsPerUnit} />
        </label>
        <label className="block">
          <span className={labelClass}>Price (ZAR)</span>
          <input name="price" inputMode="decimal" required defaultValue={price} placeholder="189.00" className={inputClass} />
          <Error message={state.fieldErrors?.price} />
        </label>
        <label className="block">
          <span className={labelClass}>Cartons in stock</span>
          <input name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} className={inputClass} />
          <Error message={state.fieldErrors?.stock} />
        </label>
        <label className="block">
          <span className={labelClass}>Sort order</span>
          <input name="sortOrder" type="number" min={0} defaultValue={product?.sortOrder ?? 0} className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Image URL</span>
        <input
          name="imageUrl"
          defaultValue={imageIsUpload ? "" : (product?.imageUrl ?? "")}
          placeholder="https:// or /products/everyday-24.svg"
          className={inputClass}
        />
        {imageIsUpload ? <span className="mt-1 block text-sm text-bark">This product currently uses an uploaded image.</span> : null}
      </label>
      <label className="block">
        <span className={labelClass}>Or upload an image</span>
        <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" className={`${inputClass} py-2`} />
        <span className="mt-1 block text-sm text-bark">JPEG, PNG, or WebP under 600KB. An upload replaces the URL.</span>
      </label>
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" name="removeImage" />
        Remove the current image
      </label>
      <label className="flex min-h-12 items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} />
        Active on the shop
      </label>
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Saving…" : product ? "Save product" : "Add product"}
      </button>
    </form>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
