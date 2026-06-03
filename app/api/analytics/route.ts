import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenant_id") ?? "vpro";

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select("id, ingediend_op, sentiment, type, status, prioriteit, onderwerp, hoofdthema, is_spam")
    .eq("tenant_id", tenantId)
    .order("ingediend_op", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Geen data" }, { status: 500 });

  const echt = data.filter((r) => !r.is_spam);
  const spam = data.filter((r) => r.is_spam);

  // Inzendingen per dag — afgelopen 30 dagen
  const nu = new Date();
  const perDag: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nu);
    d.setDate(d.getDate() - i);
    perDag[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of echt) {
    const dag = r.ingediend_op.slice(0, 10);
    if (dag in perDag) perDag[dag] = (perDag[dag] ?? 0) + 1;
  }
  const inzendingen_per_dag = Object.entries(perDag).map(([dag, aantal]) => ({ dag, aantal }));

  // Sentiment
  const sentimentTelling: Record<string, number> = {};
  for (const r of echt) {
    if (r.sentiment) sentimentTelling[r.sentiment] = (sentimentTelling[r.sentiment] ?? 0) + 1;
  }
  const sentiment = Object.entries(sentimentTelling).map(([naam, waarde]) => ({ naam, waarde }));

  // Type
  const typeTelling: Record<string, number> = {};
  for (const r of echt) {
    if (r.type) typeTelling[r.type] = (typeTelling[r.type] ?? 0) + 1;
  }
  const types = Object.entries(typeTelling).map(([naam, waarde]) => ({ naam, waarde }));

  // Status
  const statusTelling: Record<string, number> = {};
  for (const r of echt) {
    if (r.status) statusTelling[r.status] = (statusTelling[r.status] ?? 0) + 1;
  }
  const statussen = Object.entries(statusTelling).map(([naam, waarde]) => ({ naam, waarde }));

  // Prioriteit
  const prioriteitTelling: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of echt) {
    if (r.prioriteit >= 1 && r.prioriteit <= 5) {
      prioriteitTelling[r.prioriteit] = (prioriteitTelling[r.prioriteit] ?? 0) + 1;
    }
  }
  const prioriteiten = Object.entries(prioriteitTelling).map(([p, aantal]) => ({ prioriteit: Number(p), aantal }));

  // Hoofdthema
  const hoofdthemaTelling: Record<string, number> = {};
  for (const r of echt) {
    if (r.hoofdthema) hoofdthemaTelling[r.hoofdthema] = (hoofdthemaTelling[r.hoofdthema] ?? 0) + 1;
  }
  const hoofdthemas = Object.entries(hoofdthemaTelling)
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => b.aantal - a.aantal);

  // Top 10 onderwerpen
  const onderwerpTelling: Record<string, number> = {};
  for (const r of echt) {
    if (r.onderwerp && r.onderwerp !== "onbekend") {
      onderwerpTelling[r.onderwerp] = (onderwerpTelling[r.onderwerp] ?? 0) + 1;
    }
  }
  const top_onderwerpen = Object.entries(onderwerpTelling)
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => b.aantal - a.aantal)
    .slice(0, 10);

  // Gemiddelde prioriteit
  const gemPrioriteit = echt.length
    ? Math.round((echt.reduce((s, r) => s + (r.prioriteit ?? 0), 0) / echt.length) * 10) / 10
    : 0;

  // Inzendingen deze week
  const weekGeleden = new Date(nu);
  weekGeleden.setDate(weekGeleden.getDate() - 7);
  const dezeWeek = echt.filter((r) => new Date(r.ingediend_op) >= weekGeleden).length;

  return NextResponse.json({
    totaal: echt.length,
    spam: spam.length,
    dezeWeek,
    gemPrioriteit,
    inzendingen_per_dag,
    sentiment,
    types,
    statussen,
    prioriteiten,
    hoofdthemas,
    top_onderwerpen,
  });
}
