import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paymentSettings, type PaymentSettings } from "@/lib/db/schema";
import { maskSecret, readStoredSecret } from "@/lib/secrets";
import { yocoMode } from "@/lib/yoco";

export type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
};

export type PaymentConfig = {
  yocoEnabled: boolean;
  eftEnabled: boolean;
  yocoPublicKey: string;
  yocoSecretKey: string;
  yocoWebhookSecret: string;
  yocoSecretSource: "environment" | "saved" | "missing";
  yocoWebhookSource: "environment" | "saved" | "missing";
  yocoPublicSource: "environment" | "saved" | "missing";
  secretUnreadable: boolean;
  webhookUnreadable: boolean;
  mode: "test" | "live" | "unknown";
  bank: BankDetails;
};

function blankSettings(): PaymentSettings {
  return {
    id: "default",
    yocoEnabled: false,
    eftEnabled: true,
    yocoPublicKey: "",
    yocoSecretKey: "",
    yocoWebhookSecret: "",
    bankAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankBranchCode: "",
    bankAccountType: "",
    updatedAt: new Date(0),
  };
}

export function bankDetailsComplete(bank: BankDetails) {
  return Boolean(bank.accountName && bank.bankName && bank.accountNumber && bank.branchCode && bank.accountType);
}

export function eftInstructions(bank: BankDetails, orderNumber: number) {
  return [
    "Pay by EFT. The order stays awaiting payment until the transfer is marked paid.",
    `Account holder: ${bank.accountName}`,
    `Bank: ${bank.bankName}`,
    `Account number: ${bank.accountNumber}`,
    `Branch code: ${bank.branchCode}`,
    `Account type: ${bank.accountType}`,
    `Payment reference: ${orderNumber}`,
    "Use the order number as the payment reference so the transfer can be matched.",
  ].join("\n");
}

export async function getPaymentRow() {
  if (!process.env.DATABASE_URL) return blankSettings();
  const [row] = await getDb().select().from(paymentSettings).where(eq(paymentSettings.id, "default")).limit(1);
  return row ?? blankSettings();
}

function secretFromEnvOrStore(envName: string, stored: string) {
  const fromEnv = process.env[envName]?.trim() ?? "";
  if (fromEnv) return { value: fromEnv, source: "environment" as const, unreadable: false };
  if (!stored) return { value: "", source: "missing" as const, unreadable: false };
  const value = readStoredSecret(stored);
  if (!value) return { value: "", source: "saved" as const, unreadable: true };
  return { value, source: "saved" as const, unreadable: false };
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const row = await getPaymentRow();
  const secret = secretFromEnvOrStore("YOCO_SECRET_KEY", row.yocoSecretKey);
  const webhook = secretFromEnvOrStore("YOCO_WEBHOOK_SECRET", row.yocoWebhookSecret);
  const publicFromEnv = process.env.YOCO_PUBLIC_KEY?.trim() ?? "";
  const yocoPublicKey = publicFromEnv || row.yocoPublicKey;
  return {
    yocoEnabled: row.yocoEnabled,
    eftEnabled: row.eftEnabled,
    yocoPublicKey,
    yocoSecretKey: secret.value,
    yocoWebhookSecret: webhook.value,
    yocoSecretSource: secret.unreadable ? "saved" : secret.source,
    yocoWebhookSource: webhook.unreadable ? "saved" : webhook.source,
    yocoPublicSource: publicFromEnv ? "environment" : row.yocoPublicKey ? "saved" : "missing",
    secretUnreadable: secret.unreadable,
    webhookUnreadable: webhook.unreadable,
    mode: yocoMode(secret.value),
    bank: {
      accountName: row.bankAccountName,
      bankName: row.bankName,
      accountNumber: row.bankAccountNumber,
      branchCode: row.bankBranchCode,
      accountType: row.bankAccountType,
    },
  };
}

export function paymentSettingsView(config: PaymentConfig) {
  return {
    yocoEnabled: config.yocoEnabled,
    eftEnabled: config.eftEnabled,
    yocoPublicKey: config.yocoPublicSource === "environment" ? config.yocoPublicKey : config.yocoPublicKey,
    yocoPublicSource: config.yocoPublicSource,
    yocoSecretHint: config.yocoSecretKey ? maskSecret(config.yocoSecretKey) : "",
    yocoSecretSource: config.yocoSecretSource,
    secretUnreadable: config.secretUnreadable,
    yocoWebhookHint: config.yocoWebhookSecret ? maskSecret(config.yocoWebhookSecret) : "",
    yocoWebhookSource: config.yocoWebhookSource,
    webhookUnreadable: config.webhookUnreadable,
    mode: config.mode,
    bank: config.bank,
  };
}

export type CheckoutMethod = "yoco" | "eft";

export async function checkoutMethods(): Promise<CheckoutMethod[]> {
  const config = await getPaymentConfig();
  const methods: CheckoutMethod[] = [];
  if (config.yocoEnabled && config.yocoPublicKey && config.yocoSecretKey) methods.push("yoco");
  if (config.eftEnabled && bankDetailsComplete(config.bank)) methods.push("eft");
  return methods;
}
