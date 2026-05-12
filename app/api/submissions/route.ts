import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id") ?? "vpro";
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const sentiment = searchParams.get("sentiment");
  const onderwerp = searchParams.get("onderwerp");
  const hoofdthema = searchParams.get("hoofdthema");
  const spam = searchParams.get("spam");

  let query = supabaseAdmin
    .from("submissions")
    .select("*")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order("ingediend_op", { ascending: false });

  if (type === "feedback") query = query.in("type", ["klacht", "ervaring", "overig"]);
  else if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (sentiment) query = query.eq("sentiment", sentiment);
  if (hoofdthema) query = query.eq("hoofdthema", hoofdthema);
  if (onderwerp) query = query.eq("onderwerp", onderwerp);
  if (spam === "true") query = query.or("is_spam.eq.true,status.eq.spam");
  else query = query.or("is_spam.eq.false,is_spam.is.null").neq("status", "spam");

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id, updates } = await req.json() as { id: string; updates: Record<string, unknown> };

  const { error } = await supabaseAdmin
    .from("submissions")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
