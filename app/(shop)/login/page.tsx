import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";

export const metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Loading…</div>}>
      <LoginBody searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginBody({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "/account/orders");
  if (user) redirect(nextPath);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-serif text-4xl tracking-tight">Log in</h1>
      <p className="mt-2 text-sm leading-6 text-bark">Use the email and password for your Softmill account.</p>
      <div className="mt-6 rounded-3xl border border-line bg-foam p-5">
        <AuthForm mode="login" nextPath={nextPath} />
      </div>
      <p className="mt-4 text-sm">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-pine">
          Create an account
        </Link>
      </p>
    </div>
  );
}
