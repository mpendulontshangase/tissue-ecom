"use client";

import { useState } from "react";
import { NoImage } from "@/components/no-image";
import { productImageSrc } from "@/lib/image-limits";

export function ProductGallery({
  name,
  images,
}: {
  name: string;
  images: { id: string; isMain: boolean }[];
}) {
  const ordered = [...images].sort((a, b) => Number(b.isMain) - Number(a.isMain));
  const [activeId, setActiveId] = useState(ordered[0]?.id ?? "");
  const active = ordered.find((image) => image.id === activeId) ?? ordered[0];

  if (!active) {
    return (
      <div className="overflow-hidden rounded-[2rem] border border-line">
        <NoImage className="aspect-square w-full" label={`No image for ${name}`} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[2rem] border border-line bg-sand">
        {/* Served from the app's image route, including owner uploads. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImageSrc(active.id)}
          alt={`${name}${active.isMain ? ", main picture" : ""}`}
          className="aspect-square w-full object-cover"
        />
      </div>
      {ordered.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {ordered.map((image, index) => {
            const selected = image.id === active.id;
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveId(image.id)}
                  aria-pressed={selected}
                  aria-label={image.isMain ? "Main picture, shown on the shop" : `Picture ${index + 1}`}
                  className={`overflow-hidden rounded-xl border-2 ${selected ? "border-pine" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageSrc(image.id)} alt="" className="h-16 w-16 object-cover" />
                </button>
                {image.isMain ? <span className="mt-1 block text-center text-[11px] font-semibold text-pine">Main</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
