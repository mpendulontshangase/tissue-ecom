"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

export function FlashToast({ message, kind = "ok" }: { message?: string; kind?: "ok" | "error" }) {
  const push = useToast();
  const sent = useRef(false);

  useEffect(() => {
    if (!message || sent.current) return;
    sent.current = true;
    push(kind, message);
  }, [kind, message, push]);

  return null;
}
