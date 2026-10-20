import { createHmac, timingSafeEqual } from "node:crypto";

export const YOCO_CHECKOUTS_URL = "https://payments.yoco.com/api/checkouts";
export const YOCO_MIN_CENTS = 200;
const REPLAY_WINDOW_SECONDS = 180;

export type YocoCheckout = {
  id: string;
  redirectUrl: string;
  status: string;
  amount: number;
  currency: string;
  paymentId: string | null;
};

export type YocoEvent = {
  id: string;
  type: string;
  payload: {
    id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: { checkoutId?: string; orderId?: string };
  };
};

type FetchLike = typeof fetch;

export function yocoMode(secretKey: string): "test" | "live" | "unknown" {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function verifyYocoSignature(input: {
  secret: string;
  webhookId: string;
  timestamp: string;
  signatureHeader: string;
  rawBody: string;
  nowMs?: number;
}) {
  const timestamp = Number(input.timestamp);
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (!input.webhookId || !Number.isFinite(timestamp)) {
    return { ok: false as const, reason: "Missing webhook id or timestamp." };
  }
  if (Math.abs(now - timestamp) > REPLAY_WINDOW_SECONDS) {
    return { ok: false as const, reason: "Webhook timestamp is outside the allowed window." };
  }

  const encoded = input.secret.startsWith("whsec_") ? input.secret.slice("whsec_".length) : "";
  if (!encoded) return { ok: false as const, reason: "Webhook secret is not a Yoco whsec_ secret." };
  const secretBytes = Buffer.from(encoded, "base64");
  const expected = createHmac("sha256", secretBytes)
    .update(`${input.webhookId}.${input.timestamp}.${input.rawBody}`)
    .digest("base64");
  const expectedBytes = Buffer.from(expected);

  const candidates = input.signatureHeader
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  const match = candidates.some((candidate) => {
    const actual = Buffer.from(candidate);
    return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
  });
  if (!match) return { ok: false as const, reason: "Webhook signature does not match." };
  return { ok: true as const };
}

export function parseYocoEvent(rawBody: string): YocoEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as YocoEvent;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.type !== "string" || !parsed.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function checkoutMatchesOrder(input: {
  amountCents: number;
  currency: string | undefined;
  checkoutId: string | undefined;
  orderId: string | undefined;
  expectedAmountCents: number;
  expectedCheckoutId: string | null;
  expectedOrderId: string;
}) {
  if (input.currency !== "ZAR") return false;
  if (input.amountCents !== input.expectedAmountCents) return false;
  if (input.expectedCheckoutId && input.checkoutId && input.checkoutId !== input.expectedCheckoutId) return false;
  if (input.orderId && input.orderId !== input.expectedOrderId) return false;
  if (!input.checkoutId && !input.orderId) return false;
  return true;
}

function asCheckout(value: unknown): YocoCheckout | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.redirectUrl !== "string") return null;
  return {
    id: row.id,
    redirectUrl: row.redirectUrl,
    status: typeof row.status === "string" ? row.status : "",
    amount: typeof row.amount === "number" ? row.amount : 0,
    currency: typeof row.currency === "string" ? row.currency : "",
    paymentId: typeof row.paymentId === "string" ? row.paymentId : null,
  };
}

export async function createYocoCheckout(
  input: {
    secretKey: string;
    amountCents: number;
    orderId: string;
    orderNumber: number;
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
    lineItems: { displayName: string; quantity: number; priceCents: number }[];
  },
  fetchImpl: FetchLike = fetch,
) {
  if (input.amountCents < YOCO_MIN_CENTS) {
    throw new Error("Yoco does not accept a payment under R2.00.");
  }
  const response = await fetchImpl(YOCO_CHECKOUTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.orderId,
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: "ZAR",
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      failureUrl: input.failureUrl,
      externalId: String(input.orderNumber),
      metadata: { orderId: input.orderId },
      lineItems: input.lineItems.map((item) => ({
        displayName: item.displayName,
        quantity: item.quantity,
        pricingDetails: { price: item.priceCents },
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Yoco could not start the checkout (${response.status}).`);
  }
  const checkout = asCheckout(await response.json());
  if (!checkout) throw new Error("Yoco did not return a checkout link.");
  return checkout;
}

export async function lookupYocoCheckout(secretKey: string, checkoutId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`${YOCO_CHECKOUTS_URL}/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) return null;
  return asCheckout(await response.json());
}
