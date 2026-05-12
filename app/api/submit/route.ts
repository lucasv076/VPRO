import { NextRequest, NextResponse } from "next/server";
import { analyzeSubmission } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";
import { FormMessage } from "@/types";

export async function POST(req: NextRequest) {
  const { messages, tenantId, naam, email, telefoonnummer, presetType } = await req.json() as {
    messages: FormMessage[];
    tenantId: string;
    naam: string;
    email: string;
    telefoonnummer: string;
    presetType?: string;
  };

  const origineel = messages.find((m) => m.role === "user")?.content ?? "";
  const volledige = messages
    .map((m) => `${m.role === "user" ? "Kijker" : "Formulier"}: ${m.content}`)
    .join("\n");

  const analyse = await analyzeSubmission(volledige);

  const { error } = await supabaseAdmin.from("submissions").insert({
    tenant_id: tenantId,
    naam: naam || null,
    email: email || null,
    telefoonnummer: telefoonnummer || null,
    origineel_bericht: origineel,
    volledige_context: volledige,
    is_spam: analyse.is_spam,
    hoofdthema: analyse.hoofdthema,
    type: presetType ?? analyse.type,
    onderwerp: analyse.onderwerp,
    samenvatting: analyse.samenvatting,
    sentiment: analyse.sentiment,
    prioriteit: analyse.prioriteit,
    trefwoorden: analyse.trefwoorden,
    compleetheid_score: analyse.compleetheid_score,
    status: "nieuw",
    labels: [],
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
