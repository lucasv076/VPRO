import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

type EmbeddingRij = {
  id: string;
  samenvatting: string;
  onderwerp: string;
  embedding: number[];
};

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (normA * normB);
}

export async function POST(req: NextRequest) {
  const { tenantId = "vpro", drempel = 0.72, minGroep = 3, uren = 24 } =
    await req.json() as {
      tenantId?: string;
      drempel?: number;
      minGroep?: number;
      uren?: number;
    };

  const { data, error } = await supabaseAdmin.rpc("haal_recente_embeddings", {
    uren,
    tenant: tenantId,
  });

  if (error) {
    console.error("Supabase RPC fout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length < minGroep) {
    return NextResponse.json({ trends: [] });
  }

  // PostgREST geeft vector terug als string "[0.1,0.2,...]" — parse naar number[]
  const rijen = (data as (Omit<EmbeddingRij, "embedding"> & { embedding: number[] | string })[]).map(r => ({
    ...r,
    embedding: typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding,
  })) as EmbeddingRij[];
  const bezocht = new Set<string>();
  const clusters: EmbeddingRij[][] = [];

  for (const item of rijen) {
    if (bezocht.has(item.id)) continue;
    const groep: EmbeddingRij[] = [item];
    bezocht.add(item.id);

    for (const ander of rijen) {
      if (bezocht.has(ander.id)) continue;
      if (cosine(item.embedding, ander.embedding) >= drempel) {
        groep.push(ander);
        bezocht.add(ander.id);
      }
    }

    if (groep.length >= minGroep) clusters.push(groep);
  }

  if (clusters.length === 0) {
    return NextResponse.json({ trends: [] });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const trends = await Promise.all(
    clusters.map(async (groep) => {
      const onderwerpen = groep.map((g) => g.onderwerp).join(", ");
      const res = await model.generateContent(
        `Geef één Nederlandse trendnaam van 4 tot 6 woorden voor dit cluster kijkersmeldingen. Geef alleen de naam, geen lijst, geen alternatieven, geen uitleg. Cluster: ${onderwerpen}`
      );
      const naam = res.response.text().trim().split("\n")[0].replace(/^\d+\.\s*\*{0,2}/, "").replace(/\*{0,2}$/, "").trim();
      return {
        naam,
        aantalMeldingen: groep.length,
        items: groep.map(({ id, samenvatting, onderwerp }) => ({ id, samenvatting, onderwerp })),
      };
    })
  );

  return NextResponse.json({ trends });
}
