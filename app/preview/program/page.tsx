import { notFound } from "next/navigation";
import { ProgramView } from "@/components/program-view";
import { sampleActions, sampleDaily, sampleProgram, sampleSeasonRewards } from "@/app/preview/sample";
import { flags } from "@/lib/flags";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function ProgramPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <ProgramView {...sampleProgram} daily={flags.dailyRewards ? sampleDaily : null} seasonRewards={flags.seasonRewards ? sampleSeasonRewards : null} actions={sampleActions} />;
}
