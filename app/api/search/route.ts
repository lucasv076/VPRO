import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embedding";
import { supabaseAdmin } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

type ZoekResultaat = {
  id: string;
  samenvatting: string;
  onderwerp: string;
  origineel_bericht: string;
  ingediend_op: string;
  gelijkenis: number;
};

export async function POST(req: NextRequest) {
  const { vraag, tenantId = "vpro" } = await req.json() as {
    vraag: string;
    tenantId?: string;
  };

  if (!vraag?.trim()) {
    return NextResponse.json({ error: "Geen vraag opgegeven" }, { status: 400 });
  }

  const queryEmbedding = await generateEmbedding(vraag);

  const { data: resultaten, error } = await supabaseAdmin.rpc("zoek_vergelijkbaar", {
    query_embedding: queryEmbedding,
    match_count: 5,
    tenant: tenantId,
  });

  if (error) {
    console.error("Supabase RPC fout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!resultaten || resultaten.length === 0) {
    return NextResponse.json({
      antwoord: "Geen relevante inzendingen gevonden voor deze vraag.",
      bronnen: [],
    });
  }

  const context = (resultaten as ZoekResultaat[])
    .map((r, i) =>
      `[${i + 1}] ${r.onderwerp} (${new Date(r.ingediend_op).toLocaleDateString("nl-NL")}): ${r.samenvatting}`
    )
    .join("\n");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt =
    `Je bent een assistent voor een nieuwsredactie.\n` +
    `Beantwoord de vraag op basis van alleen de onderstaande kijkersinzendingen.\n` +
    `Verwijs naar de nummers [1], [2] etc. als bronvermelding.\n\n` +
    `Inzendingen:\n${context}\n\nVraag: ${vraag}`;

  const result = await model.generateContent(prompt);

  return NextResponse.json({
    antwoord: result.response.text(),
    bronnen: resultaten as ZoekResultaat[],
  });
}
