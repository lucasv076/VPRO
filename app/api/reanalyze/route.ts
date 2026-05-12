import { NextRequest, NextResponse } from "next/server";
import { analyzeSubmission } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from("submissions")
    .select("volledige_context, origineel_bericht")
    .eq("id", id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "Inzending niet gevonden" }, { status: 404 });
  }

  const tekst = submission.volledige_context || submission.origineel_bericht;
  const analyse = await analyzeSubmission(tekst);

  const updates = {
    hoofdthema: analyse.hoofdthema,
    type: analyse.type,
    onderwerp: analyse.onderwerp,
    samenvatting: analyse.samenvatting,
    sentiment: analyse.sentiment,
    prioriteit: analyse.prioriteit,
    trefwoorden: analyse.trefwoorden,
    compleetheid_score: analyse.compleetheid_score,
    is_spam: analyse.is_spam,
  };

  const { error: updateError } = await supabaseAdmin
    .from("submissions")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updates);
}
