"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** Ticks down to an ISO timestamp; renders "Ready" at zero. Genuine interactivity, so a Client Component. */
export function Countdown({ until, onDoneLabel = "Ready" }: { until: string; onDoneLabel?: string }) {
  const target = new Date(until).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, (target - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, (target - Date.now()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (remaining <= 0) return <span className="font-semibold text-ink">{onDoneLabel}</span>;
  return <span className="tabular-nums text-ink-muted">{formatDuration(remaining)}</span>;
}
