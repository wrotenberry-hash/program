import { notFound } from "next/navigation";
import { FactionView } from "@/components/faction-view";
import { sampleFaction } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function FactionPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <FactionView {...sampleFaction} />;
}
