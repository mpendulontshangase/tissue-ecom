"use client";

import { useState } from "react";
import { BULK_PRESETS } from "@/lib/constants";
import { formatZar, plural } from "@/lib/format";

export function QuantityPicker({
  max,
  packSize,
  sheetsPerUnit,
  unitLabel,
  unitPriceCents,
  defaultValue = 1,
  compact = false,
}: {
  max: number;
  packSize: number;
  sheetsPerUnit: number;
  unitLabel: string;
  unitPriceCents?: number;
  defaultValue?: number;
  compact?: boolean;
}) {
  const ceiling = Math.max(1, Math.min(max, 9999));
  const [quantity, setQuantity] = useState(Math.min(defaultValue, ceiling));
  const safe = Number.isFinite(quantity) ? Math.min(Math.max(quantity, 1), ceiling) : 1;
  const presets = BULK_PRESETS.filter((preset) => preset <= ceiling);

  function setSafe(next: number) {
    if (!Number.isFinite(next)) return;
    setQuantity(Math.min(Math.max(Math.trunc(next), 1), ceiling));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-foam text-xl"
          onClick={() => setSafe(safe - 1)}
          aria-label="Decrease cartons"
        >
          −
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Number of cartons</span>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={ceiling}
            value={safe}
            onChange={(event) => setQuantity(Number(event.target.value))}
            onBlur={() => setQuantity(safe)}
            className="min-h-12 w-full rounded-xl border border-line bg-foam px-3 text-center text-base font-semibold"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-foam text-xl"
          onClick={() => setSafe(safe + 1)}
          aria-label="Increase cartons"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={safe === preset}
            onClick={() => setSafe(preset)}
            className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
              safe === preset ? "bg-pine text-foam" : "bg-sand text-ink"
            }`}
          >
            {preset} {preset === 1 ? "carton" : "cartons"}
          </button>
        ))}
      </div>
      <p className="text-sm leading-6 text-bark">
        {plural(safe, "carton")} × {packSize} {unitLabel} ={" "}
        <strong className="text-ink">
          {safe * packSize} {unitLabel}
        </strong>
        {compact ? null : (
          <>
            {" "}
            · {(safe * packSize * sheetsPerUnit).toLocaleString("en-ZA")} sheets
          </>
        )}
        {unitPriceCents ? (
          <>
            {" "}
            · <strong className="text-ink">{formatZar(unitPriceCents * safe)}</strong>
          </>
        ) : null}
      </p>
    </div>
  );
}
