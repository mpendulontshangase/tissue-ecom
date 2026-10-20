import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const prefix = "enc:v1";

function encryptionKey() {
  const material = process.env.PAYMENT_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!material) {
    throw new Error("Set PAYMENT_ENCRYPTION_KEY or AUTH_SECRET before storing payment secrets.");
  }
  return createHash("sha256").update(`softmill-payment-v1:${material}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [prefix, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSecret(stored: string) {
  if (!stored) return "";
  const parts = stored.split(":");
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== prefix) return "";
  const ivPart = parts[2];
  const tagPart = parts[3];
  const dataPart = parts[4];
  if (!ivPart || !tagPart || !dataPart) return "";
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
  return plain.toString("utf8");
}

export function maskSecret(plain: string) {
  const trimmed = plain.trim();
  if (!trimmed) return "";
  return `••••${trimmed.slice(-4)}`;
}

export function readStoredSecret(stored: string) {
  if (!stored) return "";
  try {
    return decryptSecret(stored);
  } catch {
    return "";
  }
}
