import "server-only";

import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { sessions, users, type UserRole } from "@/lib/db/schema";
import { readSessionCookie } from "@/lib/session";
import { verifySessionToken } from "@/lib/session-token";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readSessionCookie();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, payload.sessionId), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);

  return row ?? null;
});

export async function requireUser(nextPath = "/account/orders") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
