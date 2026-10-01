import { notFound } from "next/navigation";
import { LeagueView } from "@/components/league-view";
import { sampleLeague } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

export default function LeaguePreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <LeagueView {...sampleLeague} />;
}
