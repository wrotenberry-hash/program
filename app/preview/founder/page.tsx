import { notFound } from "next/navigation";
import { FounderView } from "@/components/founder-view";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function FounderPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return (
    <FounderView
      token="sample"
      r={{
        today: "2026-11-30",
        players: 214,
        active_today: 131,
        active_7_days: 176,
        cohorts: [
          { week_of: "2026-11-16", players: 38, next_day: 24, next_day_of: 38, first_week: 31, first_week_of: 38, after_week: 19, after_week_of: 38, avg_days_played: 6.2 },
          { week_of: "2026-11-23", players: 172, next_day: 101, next_day_of: 160, first_week: 129, first_week_of: 160, after_week: 0, after_week_of: 0, avg_days_played: 3.4 },
          { week_of: "2026-11-30", players: 4, next_day: 0, next_day_of: 0, first_week: 0, first_week_of: 0, after_week: 0, after_week_of: 0, avg_days_played: 1 },
        ],
        events: { tutorial_start: 210, tutorial_done: 162, invite_sent: 47 },
      }}
    />
  );
}
