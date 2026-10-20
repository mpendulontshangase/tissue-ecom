import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { getPaymentConfig } from "@/lib/payment-config";
import { recordYocoPayment } from "@/lib/record-payment";
import { parseYocoEvent, verifyYocoSignature } from "@/lib/yoco";

export async function POST(request: Request) {
  await connection();
  const rawBody = await request.text();
  const config = await getPaymentConfig();
  if (!config.yocoWebhookSecret) return new Response("Webhook secret is not configured.", { status: 403 });

  const verified = verifyYocoSignature({
    secret: config.yocoWebhookSecret,
    webhookId: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signatureHeader: request.headers.get("webhook-signature") ?? "",
    rawBody,
  });
  if (!verified.ok) return new Response(verified.reason, { status: 403 });

  const event = parseYocoEvent(rawBody);
  if (!event) return new Response("Invalid event.", { status: 400 });

  const succeeded = event.type === "payment.succeeded" && event.payload.status === "succeeded";
  const failed = event.type === "payment.failed";
  if (!succeeded && !failed) return new Response("Ignored.", { status: 200 });

  const amount = event.payload.amount;
  if (typeof amount !== "number") return new Response("Missing amount.", { status: 400 });

  await recordYocoPayment({
    eventId: event.id,
    eventType: event.type,
    amountCents: amount,
    currency: event.payload.currency,
    checkoutId: event.payload.metadata?.checkoutId,
    orderId: event.payload.metadata?.orderId,
    paymentId: event.payload.id,
    succeeded,
  });
  revalidatePath("/", "layout");
  return new Response("OK", { status: 200 });
}
