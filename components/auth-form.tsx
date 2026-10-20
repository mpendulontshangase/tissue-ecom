"use client";

import { useActionState } from "react";
import { loginAction, signupAction } from "@/actions/auth";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import { initialActionState } from "@/lib/validation";

export function AuthForm({ mode, nextPath }: { mode: "login" | "signup"; nextPath: string }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      {mode === "signup" ? (
        <label className="block">
          <span className={labelClass}>Name</span>
          <input name="name" autoComplete="name" required className={inputClass} />
          <FieldError message={state.fieldErrors?.name} />
        </label>
      ) : null}
      <label className="block">
        <span className={labelClass}>Email</span>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
        <FieldError message={state.fieldErrors?.email} />
      </label>
      <label className="block">
        <span className={labelClass}>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.password} />
      </label>
      {mode === "signup" ? (
        <label className="block">
          <span className={labelClass}>Confirm password</span>
          <input name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
          <FieldError message={state.fieldErrors?.confirm} />
        </label>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-sm text-clay">
      {message}
    </span>
  );
}
