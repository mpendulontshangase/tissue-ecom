import "server-only";

export type EmailResult = {
  status: "sent" | "skipped" | "failed";
};

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export function orderLink(orderId: string) {
  const path = `/account/orders/${orderId}`;
  const base = appBaseUrl();
  return base ? `${base}${path}` : path;
}

export async function sendCustomerEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { status: "skipped" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error(`Resend email failed with status ${response.status}`);
      return { status: "failed" };
    }
    return { status: "sent" };
  } catch (error) {
    console.error("Resend email request failed", error instanceof Error ? error.message : "unknown");
    return { status: "failed" };
  }
}
