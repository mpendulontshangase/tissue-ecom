"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "@/lib/session";
import { authSecretReady, signSession, verifySessionToken } from "@/lib/session-token";
import { SESSION_DAYS } from "@/lib/constants";
import {
  fieldErrorsFrom,
  initialActionState,
  loginSchema,
  signupSchema,
  type ActionState,
} from "@/lib/validation";
import { safeNextPath } from "@/lib/format";

async function startSession(userId: string, role: "customer" | "admin") {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const [session] = await getDb()
    .insert(sessions)
    .values({ userId, expiresAt: expires })
    .returning({ id: sessions.id });
  if (!session) throw new Error("Could not start a session");
  const token = await signSession({ sessionId: session.id, role });
  await writeSessionCookie(token, expires);
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (!authSecretReady()) {
      return { error: "Sign-up is unavailable until AUTH_SECRET is configured." };
    }
    const parsed = signupSchema.safeParse({
      name: formData.get("name"),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    if (existing) return { error: "An account with that email already exists." };

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "customer",
      })
      .returning({ id: users.id, role: users.role });
    if (!user) return { error: "Could not create the account." };

    await startSession(user.id, user.role);
  } catch (error) {
    unstable_rethrow(error);
    console.error(error instanceof Error ? error.message : "signup failed");
    return { error: "Could not create the account. Please try again." };
  }

  redirect(safeNextPath(String(formData.get("next") ?? ""), "/account/orders"));
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (!authSecretReady()) {
      return { error: "Login is unavailable until AUTH_SECRET is configured." };
    }
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: formData.get("password"),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !valid) return { error: "Email or password is incorrect." };

    await startSession(user.id, user.role);
  } catch (error) {
    unstable_rethrow(error);
    console.error(error instanceof Error ? error.message : "login failed");
    return { error: "Could not log in. Please try again." };
  }

  redirect(safeNextPath(String(formData.get("next") ?? "")));
}

export async function logoutAction() {
  const token = await readSessionCookie();
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await getDb().delete(sessions).where(eq(sessions.id, payload.sessionId));
    }
  }
  await clearSessionCookie();
  redirect("/");
}

void initialActionState;
