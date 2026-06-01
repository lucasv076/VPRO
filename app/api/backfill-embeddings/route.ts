import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embedding";

export async function POST(req: NextRequest) {
  const { secret } = await req.json() as { secret?: string };

  if (secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }

  const { data: rijen, error } = await supabaseAdmin
    .from("submissions")
    .select("id, volledige_context, origineel_bericht")
    .is("embedding", null)
    .eq("is_spam", false)
    .order("ingediend_op", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rijen || rijen.length === 0) {
    return NextResponse.json({ verwerkt: 0, bericht: "Alle inzendingen hebben al een embedding." });
  }

  let verwerkt = 0;
  let mislukt = 0;
  let eersteError: string | null = null;

  for (const rij of rijen) {
    const tekst = rij.volledige_context || rij.origineel_bericht;
    if (!tekst?.trim()) { mislukt++; continue; }

    try {
      const embedding = await generateEmbedding(tekst);
      // pgvector verwacht string-formaat "[0.1,0.2,...]" via PostgREST
      const embeddingStr = `[${embedding.join(",")}]`;
      const { error: updateError } = await supabaseAdmin
        .from("submissions")
        .update({ embedding: embeddingStr })
        .eq("id", rij.id);
      if (updateError) throw new Error(`DB update fout: ${updateError.message}`);
      verwerkt++;
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Embedding mislukt voor ${rij.id}:`, msg);
      if (!eersteError) eersteError = msg;
      mislukt++;
    }
  }

  return NextResponse.json({ verwerkt, mislukt, totaal: rijen.length, eersteError });
}
