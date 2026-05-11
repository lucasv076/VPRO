import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const tenantId = new URL(req.url).searchParams.get("tenant_id") ?? "vpro";

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("onderwerp")
    .eq("tenant_id", tenantId)
    .eq("is_spam", false);

  if (error) return NextResponse.json([], { status: 500 });

  const uniek = [...new Set(data.map((d) => d.onderwerp))].sort();
  return NextResponse.json(uniek);
}
