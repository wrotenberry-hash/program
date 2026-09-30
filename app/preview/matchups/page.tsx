import { notFound } from "next/navigation";
import { MatchupsView } from "@/components/matchups-view";
import { noop } from "@/app/preview/actions";
import { sampleMatchups } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function MatchupsPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <MatchupsView {...sampleMatchups} actions={{ setEmphasis: noop, challenge: noop, resolveNow: noop }} />;
}
