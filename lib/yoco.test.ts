import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";
import { checkoutMatchesOrder, createYocoCheckout, verifyYocoSignature, YOCO_CHECKOUTS_URL } from "./yoco";
import { decryptSecret, encryptSecret } from "./secrets";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function sign(secret: string, id: string, timestamp: string, body: string) {
  const mac = createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return `v1,${mac}`;
}

const webhookSecret = `whsec_${randomBytes(24).toString("base64")}`;

test("accepts a current Yoco webhook signature", () => {
  const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const result = verifyYocoSignature({
    secret: webhookSecret,
    webhookId: "msg_1",
    timestamp,
    signatureHeader: sign(webhookSecret, "msg_1", timestamp, body),
    rawBody: body,
  });
  assert.equal(result.ok, true);
});

test("rejects a bad signature and a stale timestamp", () => {
  const body = "{}";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bad = verifyYocoSignature({
    secret: webhookSecret,
    webhookId: "msg_1",
    timestamp,
    signatureHeader: "v1,bm90LXZhbGlk",
    rawBody: body,
  });
  assert.equal(bad.ok, false);

  const stale = verifyYocoSignature({
    secret: webhookSecret,
    webhookId: "msg_1",
    timestamp: "100",
    signatureHeader: sign(webhookSecret, "msg_1", "100", body),
    rawBody: body,
    nowMs: Date.now(),
  });
  assert.equal(stale.ok, false);
});

test("payment amount, currency, and checkout id must match the order", () => {
  assert.equal(
    checkoutMatchesOrder({
      amountCents: 18900,
      currency: "ZAR",
      checkoutId: "ch_1",
      orderId: "order_1",
      expectedAmountCents: 18900,
      expectedCheckoutId: "ch_1",
      expectedOrderId: "order_1",
    }),
    true,
  );
  assert.equal(
    checkoutMatchesOrder({
      amountCents: 100,
      currency: "ZAR",
      checkoutId: "ch_1",
      orderId: "order_1",
      expectedAmountCents: 18900,
      expectedCheckoutId: "ch_1",
      expectedOrderId: "order_1",
    }),
    false,
  );
});

test("create checkout uses cents, ZAR, and the idempotency key", async () => {
  const seen = { url: "", body: "", authorization: "", idempotencyKey: "" };
  const checkout = await createYocoCheckout(
    {
      secretKey: "sk_test_example",
      amountCents: 18900,
      orderId: "order_1",
      orderNumber: 1003,
      successUrl: "https://shop.example/ok",
      cancelUrl: "https://shop.example/cancel",
      failureUrl: "https://shop.example/fail",
      lineItems: [{ displayName: "Everyday Carton", quantity: 1, priceCents: 18900 }],
    },
    (async (url, init) => {
      const headers = new Headers(init?.headers);
      seen.url = String(url);
      seen.body = String(init?.body);
      seen.authorization = headers.get("Authorization") ?? "";
      seen.idempotencyKey = headers.get("Idempotency-Key") ?? "";
      return new Response(
        JSON.stringify({
          id: "ch_test",
          redirectUrl: "https://c.yoco.com/checkout/ch_test",
          status: "created",
          amount: 18900,
          currency: "ZAR",
          paymentId: null,
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  );
  assert.equal(checkout.redirectUrl, "https://c.yoco.com/checkout/ch_test");
  assert.equal(seen.url, YOCO_CHECKOUTS_URL);
  assert.equal(seen.idempotencyKey, "order_1");
  assert.equal(seen.authorization, "Bearer sk_test_example");
  const body = JSON.parse(seen.body) as { amount: number; currency: string };
  assert.equal(body.amount, 18900);
  assert.equal(body.currency, "ZAR");
});

test("payment secrets round-trip through encryption and are not stored in clear text", () => {
  const stored = encryptSecret("sk_test_super_secret_value");
  assert.equal(stored.includes("sk_test_super_secret_value"), false);
  assert.equal(decryptSecret(stored), "sk_test_super_secret_value");
});
