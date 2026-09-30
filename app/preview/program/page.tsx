import { notFound } from "next/navigation";
import { ProgramView } from "@/components/program-view";
import { sampleActions, sampleProgram } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function ProgramPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <ProgramView {...sampleProgram} actions={sampleActions} />;
}
