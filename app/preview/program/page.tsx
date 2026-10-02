import { notFound } from "next/navigation";
import { ProgramView } from "@/components/program-view";
import type { MissionStatus } from "@/components/campus-home";
import { sampleActions, sampleDaily, sampleProgram, sampleSeasonRewards } from "@/app/preview/sample";
import { flags } from "@/lib/flags";

export const dynamic = "force-dynamic";

/** Sample mission states, picked with ?mission=collect|build|done|staff. */
const MISSIONS: Record<string, MissionStatus["current"]> = {
  collect: { id: "collect", label: "Collect from your boosters", target: "coin", reward: 100, done: false },
  build: { id: "build_weight", label: "Build the Weight Room", target: "weight-room", reward: 150, done: false },
  done: { id: "collect", label: "Collect from your boosters", target: "coin", reward: 100, done: true },
  staff: { id: "scout", label: "Send your scouts out", target: "/staff", reward: 150, done: false },
};

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default async function ProgramPreview({ searchParams }: { searchParams: Promise<{ mission?: string }> }) {
  if (process.env.PREVIEWS !== "1") notFound();
  const { mission = "collect" } = await searchParams;
  const current = MISSIONS[mission] ?? null;
  const missions: MissionStatus | null = flags.firstMissions && current ? { enabled: true, total: 6, claimed: mission === "build" ? 1 : mission === "staff" ? 3 : 0, current } : null;
  return (
    <ProgramView
      {...sampleProgram}
      daily={flags.dailyRewards ? sampleDaily : null}
      seasonRewards={flags.seasonRewards ? sampleSeasonRewards : null}
      missions={missions}
      art={flags.campusArt}
      actions={{ ...sampleActions, claimMission: sampleActions.joinFaction }}
    />
  );
}
