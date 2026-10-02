import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FounderView, type Report } from "@/components/founder-view";

export const metadata: Metadata = { title: "Founder", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The founder's private numbers. Same key as the feedback export; not linked from anywhere. */
export default async function FounderPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("retention_report", { p_token: token });
  return <FounderView r={error ? null : (data as Report | null)} token={token} />;
}
