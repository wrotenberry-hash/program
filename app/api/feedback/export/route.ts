import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * One-tap feedback export. The token is checked inside the database against a
 * stored hash; this route never sees the hash. ?format=json for JSON.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await supabase.rpc("export_feedback", { p_token: token });
  if (error) return NextResponse.json({ error: "not authorized" }, { status: 401 });

  const rows = data ?? [];
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    return NextResponse.json(rows, { headers: { "cache-control": "no-store" } });
  }
  const cols = ["id", "created_at", "display_name", "account_id", "program_id", "screen", "note", "user_agent"] as const;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="feedback-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
