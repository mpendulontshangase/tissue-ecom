import { z } from "zod";
import { PROVINCES } from "@/lib/constants";

export type FieldErrors = Record<string, string>;

export type ActionState = {
  error?: string;
  fieldErrors?: FieldErrors;
  ok?: string;
};

export const initialActionState: ActionState = {};

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.email("Enter a valid email address"),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const quantitySchema = z.coerce
  .number()
  .int("Enter a whole number of cartons")
  .min(1, "Order at least 1 carton")
  .max(9999, "Quantity cannot exceed 9999 cartons");

export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2, "Enter the recipient name").max(80),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a South African phone number")
    .max(20)
    .refine((value) => normalizePhone(value) !== null, "Enter a valid South African phone number"),
  line1: z.string().trim().min(3, "Enter a street address").max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter a city").max(80),
  province: z.enum(PROVINCES, { error: "Choose a province" }),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postal code"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
  paymentMethod: z.enum(["pay_on_delivery", "eft"], { error: "Choose how you will pay" }),
});

export function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0[1-8]\d{8}$/.test(compact)) return compact;
  if (/^\+27[1-8]\d{8}$/.test(compact)) return `0${compact.slice(3)}`;
  if (/^27[1-8]\d{8}$/.test(compact)) return `0${compact.slice(2)}`;
  return null;
}

export function randsToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function normalizeHttpsUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https:\/\/\S+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeWhatsapp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const phone = normalizePhone(trimmed);
  if (phone) return `https://wa.me/27${phone.slice(1)}`;
  return normalizeHttpsUrl(trimmed);
}

const optionalHttps = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === "" || normalizeHttpsUrl(value) !== null, "Enter an https:// link");

export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(2, "Enter the shop name").max(60),
  contactPhone: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value === "" || normalizePhone(value) !== null, "Enter a valid South African phone number"),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email address")]),
  facebookUrl: optionalHttps,
  instagramUrl: optionalHttps,
  tiktokUrl: optionalHttps,
  whatsappUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => value === "" || normalizeWhatsapp(value) !== null,
      "Enter a WhatsApp number or an https:// link",
    ),
  xUrl: optionalHttps,
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
    .or(z.literal("")),
  summary: z.string().trim().min(10, "Add a short summary").max(180),
  description: z.string().trim().min(20, "Add a description").max(2000),
  packSize: z.coerce.number().int().min(1).max(500),
  sheetsPerUnit: z.coerce.number().int().min(1).max(1000),
  price: z.string().trim().min(1, "Enter a price in rand"),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const orderUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  message: z.string().trim().max(1000, "Keep the message under 1000 characters"),
  markPaid: z.boolean(),
});
