"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ToastKind = "ok" | "error";

type ToastItem = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useMemo(() => {
    return (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4200);
    };
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.kind === "error" ? "bg-clay text-foam" : "bg-pine text-foam"
            }`}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function toastMessage(state: { ok?: string; error?: string; fieldErrors?: Record<string, string> }) {
  if (state.ok) return { kind: "ok" as const, message: state.ok };
  if (state.error) return { kind: "error" as const, message: state.error };
  if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
    return { kind: "error" as const, message: "Could not save. Check the highlighted fields." };
  }
  return null;
}
