import { SignJWT, jwtVerify } from "jose";
import { SESSION_DAYS } from "@/lib/constants";
import type { UserRole } from "@/lib/db/schema";

export type SessionToken = {
  sessionId: string;
  role: UserRole;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function authSecretReady() {
  return secretKey() !== null;
}

export async function signSession(payload: SessionToken) {
  const key = secretKey();
  if (!key) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  }
  return new SignJWT({ sessionId: payload.sessionId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionToken | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.sessionId !== "string") return null;
    if (payload.role !== "admin" && payload.role !== "customer") return null;
    return { sessionId: payload.sessionId, role: payload.role };
  } catch {
    return null;
  }
}
