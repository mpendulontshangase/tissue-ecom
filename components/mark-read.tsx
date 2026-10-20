"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/actions/admin";

export function MarkReadOnView({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    void markNotificationsRead();
  }, [enabled]);
  return null;
}
