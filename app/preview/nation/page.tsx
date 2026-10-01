import { notFound } from "next/navigation";
import { NationView } from "@/components/nation-view";
import { sampleNation } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

export default function NationPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <NationView {...sampleNation} />;
}
