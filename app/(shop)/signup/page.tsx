import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";

export const metadata = { title: "Sign up" };

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-bark">Loading…</div>}>
      <SignupBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupBody({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "/account/orders");
  const user = await getCurrentUser();
  if (user) redirect(nextPath);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-serif text-4xl tracking-tight">Create an account</h1>
      <p className="mt-2 text-sm leading-6 text-bark">You need an account so order updates have somewhere to land.</p>
      <div className="mt-6 rounded-3xl border border-line bg-foam p-5">
        <AuthForm mode="signup" nextPath={nextPath} />
      </div>
      <p className="mt-4 text-sm">
        Already registered?{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-pine">
          Log in
        </Link>
      </p>
    </div>
  );
}
