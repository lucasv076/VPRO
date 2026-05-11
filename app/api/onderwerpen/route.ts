import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id") ?? "vpro";
  const hoofdthema = searchParams.get("hoofdthema");

  let query = supabaseAdmin
    .from("submissions")
    .select("onderwerp, hoofdthema")
    .eq("tenant_id", tenantId)
    .eq("is_spam", false);

  if (hoofdthema) query = query.eq("hoofdthema", hoofdthema);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 500 });

  const uniek = [...new Set(data.map((d) => d.onderwerp))].sort();
  return NextResponse.json(uniek);
}
