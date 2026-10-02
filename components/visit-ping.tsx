"use client";

import { useEffect } from "react";
import { recordVisit } from "@/app/activity/actions";

/**
 * Tells the server this player opened the game today, once per browser
 * session per day. Renders nothing and never blocks the page.
 */
export function VisitPing() {
  useEffect(() => {
    const key = `visit:${new Date().toDateString()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: ping anyway; the server counts one day per player regardless.
    }
    recordVisit().catch(() => {});
  }, []);
  return null;
}
