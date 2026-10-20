"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/actions/admin";
import { NoImage } from "@/components/no-image";
import { toastMessage, useToast } from "@/components/toast";
import type { Product } from "@/lib/db/schema";
import {
  imageSizeError,
  imageTypeError,
  MAX_PRODUCT_IMAGES,
  productImageSrc,
} from "@/lib/image-limits";
import { buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

type ExistingSlot = { key: string; kind: "existing"; id: string; src: string };
type NewSlot = { key: string; kind: "new"; file: File; src: string };
type Slot = ExistingSlot | NewSlot;

export function ProductForm({
  product,
  images = [],
}: {
  product?: Product;
  images?: { id: string; isMain: boolean }[];
}) {
  const push = useToast();
  const [slots, setSlots] = useState<Slot[]>(() =>
    images.map((image) => ({
      key: image.id,
      kind: "existing" as const,
      id: image.id,
      src: productImageSrc(image.id),
    })),
  );
  const [mainSlotKey, setMainSlotKey] = useState(() => images.find((image) => image.isMain)?.id ?? images[0]?.id ?? "");
  const [pictureError, setPictureError] = useState("");

  const [state, action, pending] = useActionState(async (prev: typeof initialActionState, formData: FormData) => {
    formData.delete("imageFile");
    let newIndex = 0;
    const tokens: string[] = [];
    for (const slot of slots) {
      if (slot.kind === "existing") {
        tokens.push(slot.id);
      } else {
        formData.append("imageFile", slot.file);
        tokens.push(`new:${newIndex}`);
        newIndex += 1;
      }
    }
    formData.set("imageOrder", tokens.join(","));
    const mainSlot = slots.find((slot) => slot.key === mainSlotKey);
    formData.set("mainKey", mainSlot ? tokenFor(slots, mainSlot) : (tokens[0] ?? ""));
    const next = await saveProduct(prev, formData);
    const toast = toastMessage(next);
    if (toast) push(toast.kind, toast.message);
    return next;
  }, initialActionState);

  const price = product ? (product.priceCents / 100).toFixed(2) : "";
  const atLimit = slots.length >= MAX_PRODUCT_IMAGES;

  function addFiles(list: FileList | null) {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return;
    const room = MAX_PRODUCT_IMAGES - slots.length;
    if (room <= 0) {
      setPictureError("A product can have at most 4 pictures. Remove one before adding another.");
      return;
    }
    const accepted: NewSlot[] = [];
    const problems: string[] = [];
    for (const file of incoming) {
      const typeError = imageTypeError(file.type);
      const sizeError = imageSizeError(file.size);
      if (typeError || sizeError) {
        problems.push(`${file.name}: ${typeError ?? sizeError}`);
        continue;
      }
      if (accepted.length >= room) {
        problems.push("A product can have at most 4 pictures. Extra files were not added.");
        break;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        kind: "new",
        file,
        src: URL.createObjectURL(file),
      });
    }
    if (accepted.length > 0) {
      setSlots((current) => [...current, ...accepted]);
      if (!mainSlotKey && accepted[0]) setMainSlotKey(accepted[0].key);
    }
    setPictureError(problems[0] ?? "");
  }

  function removeSlot(key: string) {
    const slot = slots.find((item) => item.key === key);
    if (slot?.kind === "new") URL.revokeObjectURL(slot.src);
    const next = slots.filter((item) => item.key !== key);
    if (mainSlotKey === key) setMainSlotKey(next[0]?.key ?? "");
    setSlots(next);
    setPictureError("");
  }

  function moveSlot(key: string, direction: -1 | 1) {
    setSlots((current) => {
      const index = current.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      {product?.archivedAt ? (
        <p className="rounded-xl bg-sand px-3 py-2 text-sm leading-6 text-ink">
          This product is archived because it is on past orders. Tick “Active on the shop” and save to show it again. Order history stays as it is.
        </p>
      ) : null}
      <label className="block">
        <span className={labelClass}>Name</span>
        <input name="name" required defaultValue={product?.name ?? ""} className={inputClass} />
        <FieldError message={state.fieldErrors?.name} />
      </label>
      <label className="block">
        <span className={labelClass}>URL slug</span>
        <input name="slug" defaultValue={product?.slug ?? ""} placeholder="everyday-24" className={inputClass} />
        <FieldError message={state.fieldErrors?.slug} />
      </label>
      <label className="block">
        <span className={labelClass}>Summary</span>
        <input name="summary" required defaultValue={product?.summary ?? ""} className={inputClass} />
        <FieldError message={state.fieldErrors?.summary} />
      </label>
      <label className="block">
        <span className={labelClass}>Description</span>
        <textarea name="description" required rows={5} defaultValue={product?.description ?? ""} className={`${inputClass} min-h-36 py-3`} />
        <FieldError message={state.fieldErrors?.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Boxes per carton</span>
          <input name="packSize" type="number" min={1} required defaultValue={product?.packSize ?? 24} className={inputClass} />
          <FieldError message={state.fieldErrors?.packSize} />
        </label>
        <label className="block">
          <span className={labelClass}>Sheets per box</span>
          <input name="sheetsPerUnit" type="number" min={1} required defaultValue={product?.sheetsPerUnit ?? 200} className={inputClass} />
          <FieldError message={state.fieldErrors?.sheetsPerUnit} />
        </label>
        <label className="block">
          <span className={labelClass}>Price (ZAR)</span>
          <input name="price" inputMode="decimal" required defaultValue={price} placeholder="189.00" className={inputClass} />
          <FieldError message={state.fieldErrors?.price} />
        </label>
        <label className="block">
          <span className={labelClass}>Cartons in stock</span>
          <input name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} className={inputClass} />
          <FieldError message={state.fieldErrors?.stock} />
        </label>
        <label className="block">
          <span className={labelClass}>Sort order</span>
          <input name="sortOrder" type="number" min={0} defaultValue={product?.sortOrder ?? 0} className={inputClass} />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Pictures</legend>
        <p className="text-sm leading-6 text-bark">
          Upload up to 4 JPEG, PNG, or WebP pictures, each under 800KB. Mark one as the main picture — that is the one shown on the shop.
        </p>
        {slots.length === 0 ? (
          <NoImage className="aspect-[5/2] w-full rounded-2xl border border-dashed border-line" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {slots.map((slot, index) => {
              const isMain = slot.key === mainSlotKey;
              return (
                <li key={slot.key} className="rounded-2xl border border-line bg-foam p-3">
                  <div className="overflow-hidden rounded-xl bg-sand">
                    {/* Local previews and stored pictures. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.src} alt="" className="aspect-[5/4] w-full object-cover" />
                  </div>
                  <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <input
                      type="radio"
                      name="mainPicture"
                      checked={isMain}
                      onChange={() => setMainSlotKey(slot.key)}
                    />
                    Main picture
                    {isMain ? <span className="font-medium text-pine">Shown on the shop</span> : null}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={buttonSecondaryClass} onClick={() => moveSlot(slot.key, -1)} disabled={index === 0}>
                      Earlier
                    </button>
                    <button
                      type="button"
                      className={buttonSecondaryClass}
                      onClick={() => moveSlot(slot.key, 1)}
                      disabled={index === slots.length - 1}
                    >
                      Later
                    </button>
                    <button type="button" className={buttonSecondaryClass} onClick={() => removeSlot(slot.key)}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <label className="block">
          <span className={labelClass}>{slots.length === 0 ? "Upload pictures" : "Add pictures"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={atLimit}
            className={`${inputClass} py-2 disabled:opacity-60`}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {atLimit ? (
          <p className="text-sm font-medium text-ink">A product can have at most 4 pictures. Remove one before adding another.</p>
        ) : (
          <p className="text-sm text-bark">{slots.length} of {MAX_PRODUCT_IMAGES} pictures.</p>
        )}
        {pictureError ? (
          <p role="alert" className="text-sm font-medium text-clay">
            {pictureError}
          </p>
        ) : null}
      </fieldset>

      <label className="flex min-h-12 items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={product ? product.active && !product.archivedAt : true} />
        Active on the shop
      </label>
      <button type="submit" className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Saving…" : product ? "Save product" : "Add product"}
      </button>
    </form>
  );
}

function tokenFor(slots: Slot[], slot: Slot) {
  if (slot.kind === "existing") return slot.id;
  let index = 0;
  for (const item of slots) {
    if (item.kind !== "new") continue;
    if (item.key === slot.key) return `new:${index}`;
    index += 1;
  }
  return "";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
