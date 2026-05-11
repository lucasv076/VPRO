import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const submissionId = new URL(req.url).searchParams.get("submission_id");
  if (!submissionId) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("submission_replies")
    .select("*")
    .eq("submission_id", submissionId)
    .order("verzonden_op", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { submission_id, bericht } = await req.json() as {
    submission_id: string;
    bericht: string;
  };

  const { data, error } = await supabaseAdmin
    .from("submission_replies")
    .insert({ submission_id, bericht, van: "redactie" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
