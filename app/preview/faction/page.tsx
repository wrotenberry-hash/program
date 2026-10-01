import { notFound } from "next/navigation";
import { FactionView } from "@/components/faction-view";
import { sampleFaction, sampleGoal } from "@/app/preview/sample";
import { noop } from "@/app/preview/actions";
import { flags } from "@/lib/flags";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function FactionPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <FactionView {...sampleFaction} goal={flags.factionGoals ? sampleGoal : null} goalActions={{ setGoal: noop, claimGoal: noop, setRole: noop }} />;
}
