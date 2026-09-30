import { notFound } from "next/navigation";
import { StaffView } from "@/components/staff-view";
import { noop } from "@/app/preview/actions";
import { sampleStaff } from "@/app/preview/sample";

export const dynamic = "force-dynamic";

/** Design preview with sample data. Only served when PREVIEWS=1. */
export default function StaffPreview() {
  if (process.env.PREVIEWS !== "1") notFound();
  return <StaffView {...sampleStaff} actions={{ scout: noop, starUp: noop, levelUp: noop }} />;
}
