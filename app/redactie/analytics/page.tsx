"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TENANT_ID = "vpro";
const VPRO_BLAUW = "#003580";

const SENTIMENT_KLEUREN: Record<string, string> = {
  positief: "#22c55e",
  neutraal:  "#94a3b8",
  negatief:  "#ef4444",
};

const TYPE_KLEUREN: Record<string, string> = {
  tip:      "#3b82f6",
  vraag:    "#8b5cf6",
  feedback: "#f59e0b",
  klacht:   "#ef4444",
  ervaring: "#10b981",
  overig:   "#94a3b8",
};

const TYPE_LABELS: Record<string, string> = {
  tip: "Tip", vraag: "Vraag", feedback: "Feedback",
  klacht: "Feedback", ervaring: "Feedback", overig: "Overig",
};

const STATUS_KLEUREN: Record<string, string> = {
  nieuw:         "#3b82f6",
  in_behandeling:"#f59e0b",
  afgehandeld:   "#22c55e",
  gearchiveerd:  "#94a3b8",
};

const STATUS_LABELS: Record<string, string> = {
  nieuw: "Nieuw", in_behandeling: "In behandeling",
  afgehandeld: "Afgerond", gearchiveerd: "Gearchiveerd",
};

const HOOFDTHEMA_KLEUREN = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316",
];

const PRIORITEIT_KLEUREN = ["#d1d5db","#d1d5db","#fbbf24","#f97316","#ef4444"];

type AnalyticsData = {
  totaal: number;
  spam: number;
  dezeWeek: number;
  gemPrioriteit: number;
  inzendingen_per_dag: { dag: string; aantal: number }[];
  sentiment: { naam: string; waarde: number }[];
  types: { naam: string; waarde: number }[];
  statussen: { naam: string; waarde: number }[];
  prioriteiten: { prioriteit: number; aantal: number }[];
  hoofdthemas: { naam: string; aantal: number }[];
  top_onderwerpen: { naam: string; aantal: number }[];
};

function StatKaart({ label, waarde, sub, kleur }: { label: string; waarde: string | number; sub?: string; kleur?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold" style={{ color: kleur ?? "#111827" }}>{waarde}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-gray-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.fill ?? "#111" }}>{p.value}</p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?tenant_id=${TENANT_ID}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLaden(false); })
      .catch(() => setLaden(false));
  }, []);

  if (laden) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Statistieken laden...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Kon statistieken niet laden.</p>
      </div>
    );
  }

  const dagLabels = data.inzendingen_per_dag.map((d) => {
    const datum = new Date(d.dag);
    return { ...d, label: datum.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) };
  });

  // Toon elke 5e dag als label op de X-as
  const xTicks = dagLabels.filter((_, i) => i % 5 === 0).map((d) => d.dag);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: VPRO_BLAUW }} />
          <span className="font-semibold text-gray-900 text-sm">VPRO — Analytics</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400 text-xs">ViewerPulse</span>
        </div>
        <Link
          href="/redactie"
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ← Terug naar dashboard
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stat kaarten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatKaart label="Totaal inzendingen" waarde={data.totaal} sub="excl. spam" />
          <StatKaart label="Deze week" waarde={data.dezeWeek} sub="afgelopen 7 dagen" kleur={VPRO_BLAUW} />
          <StatKaart
            label="Gem. prioriteit"
            waarde={data.gemPrioriteit}
            sub="schaal 1–5"
            kleur={data.gemPrioriteit >= 4 ? "#ef4444" : data.gemPrioriteit >= 3 ? "#f97316" : "#111827"}
          />
          <StatKaart
            label="Spam onderschept"
            waarde={data.spam}
            sub={`${data.totaal + data.spam > 0 ? Math.round((data.spam / (data.totaal + data.spam)) * 100) : 0}% van totaal`}
            kleur="#ef4444"
          />
        </div>

        {/* Inzendingen per dag */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-6">Inzendingen per dag — afgelopen 30 dagen</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dagLabels} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientBlauw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VPRO_BLAUW} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={VPRO_BLAUW} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="dag"
                ticks={xTicks}
                tickFormatter={(val) => new Date(val).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="aantal"
                stroke={VPRO_BLAUW}
                strokeWidth={2}
                fill="url(#gradientBlauw)"
                dot={false}
                activeDot={{ r: 4, fill: VPRO_BLAUW }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment + Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Sentiment donut */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment</h2>
            {data.sentiment.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Geen data</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={160}>
                  <PieChart>
                    <Pie
                      data={data.sentiment}
                      dataKey="waarde"
                      nameKey="naam"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {data.sentiment.map((entry) => (
                        <Cell key={entry.naam} fill={SENTIMENT_KLEUREN[entry.naam] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val} inzendingen`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.sentiment.map((s) => (
                    <div key={s.naam} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_KLEUREN[s.naam] ?? "#94a3b8" }} />
                      <span className="text-xs text-gray-600 capitalize">{s.naam}</span>
                      <span className="text-xs font-semibold text-gray-900 ml-auto">{s.waarde}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type verdeling */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Type inzendingen</h2>
            {data.types.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Geen data</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.types} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="naam"
                    tickFormatter={(v) => TYPE_LABELS[v] ?? v}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(val: number) => [`${val} inzendingen`]} labelFormatter={(l) => TYPE_LABELS[l] ?? l} />
                  <Bar dataKey="waarde" radius={[4, 4, 0, 0]}>
                    {data.types.map((entry) => (
                      <Cell key={entry.naam} fill={TYPE_KLEUREN[entry.naam] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hoofdthema's */}
        {data.hoofdthemas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-6">Hoofdthema&apos;s</h2>
            <div className="space-y-3">
              {data.hoofdthemas.map((h, i) => {
                const max = data.hoofdthemas[0].aantal;
                const pct = Math.round((h.aantal / max) * 100);
                return (
                  <div key={h.naam} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-44 shrink-0 truncate">{h.naam}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: HOOFDTHEMA_KLEUREN[i % HOOFDTHEMA_KLEUREN.length] }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{h.aantal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status + Prioriteit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Status</h2>
            {data.statussen.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Geen data</p>
            ) : (
              <div className="space-y-3 mt-2">
                {data.statussen.map((s) => {
                  const totaal = data.statussen.reduce((a, b) => a + b.waarde, 0);
                  const pct = Math.round((s.waarde / totaal) * 100);
                  return (
                    <div key={s.naam} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_KLEUREN[s.naam] ?? "#94a3b8" }} />
                      <span className="text-xs text-gray-600 w-32 shrink-0">{STATUS_LABELS[s.naam] ?? s.naam}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_KLEUREN[s.naam] ?? "#94a3b8" }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{s.waarde}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prioriteit */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Prioriteit verdeling</h2>
            {data.prioriteiten.every((p) => p.aantal === 0) ? (
              <p className="text-xs text-gray-400 py-8 text-center">Geen data</p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data.prioriteiten} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="prioriteit"
                    tickFormatter={(v) => `P${v}`}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(val: number) => [`${val} inzendingen`]} labelFormatter={(l) => `Prioriteit ${l}`} />
                  <Bar dataKey="aantal" radius={[4, 4, 0, 0]}>
                    {data.prioriteiten.map((entry) => (
                      <Cell key={entry.prioriteit} fill={PRIORITEIT_KLEUREN[(entry.prioriteit - 1)] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top onderwerpen */}
        {data.top_onderwerpen.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-6">Top 10 onderwerpen</h2>
            <div className="space-y-2.5">
              {data.top_onderwerpen.map((o, i) => {
                const max = data.top_onderwerpen[0].aantal;
                const pct = Math.round((o.aantal / max) * 100);
                return (
                  <div key={o.naam} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs text-gray-700 w-56 shrink-0 truncate" title={o.naam}>{o.naam}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: VPRO_BLAUW, opacity: 0.7 + (0.3 * pct / 100) }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{o.aantal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
