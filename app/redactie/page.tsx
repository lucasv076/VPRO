"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Submission, Status, SubmissionType, Sentiment, HOOFDTHEMAS, Hoofdthema } from "@/types";
import { tenants } from "@/lib/tenants";

const TENANT_ID = "vpro";
const tenant = tenants[TENANT_ID];

interface Reply {
  id: string;
  submission_id: string;
  bericht: string;
  van: string;
  verzonden_op: string;
}

const TYPE_KNOPPEN = [
  { label: "Alle", waarde: "" },
  { label: "Tips", waarde: "tip" },
  { label: "Vragen", waarde: "vraag" },
  { label: "Feedback", waarde: "feedback" },
] as const;

const STATUS_LABELS: Record<Status, string> = {
  spam: "Spam",
  concept: "Concept",
  klaar: "Klaar",
  nieuw: "Nieuw",
  in_behandeling: "In behandeling",
  afgehandeld: "Afgerond",
  gearchiveerd: "Gearchiveerd",
};

const typeBadge: Record<SubmissionType, string> = {
  vraag: "bg-blue-50 text-blue-700", klacht: "bg-red-50 text-red-700",
  tip: "bg-green-50 text-green-700", ervaring: "bg-purple-50 text-purple-700", overig: "bg-gray-50 text-gray-600",
};

const typeLabel: Record<SubmissionType, string> = {
  vraag: "Vraag", klacht: "Feedback", tip: "Tip", ervaring: "Feedback", overig: "Overig",
};

const sentimentBadge: Record<Sentiment, string> = {
  positief: "bg-green-50 text-green-700", neutraal: "bg-gray-50 text-gray-600", negatief: "bg-red-50 text-red-700",
};

const statusBadge: Record<Status, string> = {
  spam: "bg-red-50 text-red-600",
  concept: "bg-amber-50 text-amber-700",
  klaar: "bg-green-50 text-green-700",
  nieuw: "bg-blue-50 text-blue-700",
  in_behandeling: "bg-blue-50 text-blue-700",
  afgehandeld: "bg-green-50 text-green-700",
  gearchiveerd: "bg-gray-50 text-gray-500",
};

const hoofdthemaKleur: Record<Hoofdthema, { bg: string; text: string; activeBg: string }> = {
  "Gezondheid en zorg":       { bg: "bg-emerald-50", text: "text-emerald-700", activeBg: "bg-emerald-500" },
  "Werk en geld":             { bg: "bg-blue-50",    text: "text-blue-700",    activeBg: "bg-blue-500" },
  "Recht en onrecht":         { bg: "bg-red-50",     text: "text-red-700",     activeBg: "bg-red-500" },
  "Wonen en leefomgeving":    { bg: "bg-amber-50",   text: "text-amber-700",   activeBg: "bg-amber-500" },
  "Onderwijs en jeugd":       { bg: "bg-purple-50",  text: "text-purple-700",  activeBg: "bg-purple-500" },
  "Klimaat en duurzaamheid":  { bg: "bg-teal-50",    text: "text-teal-700",    activeBg: "bg-teal-500" },
  "Misinformatie en privacy": { bg: "bg-orange-50",  text: "text-orange-700",  activeBg: "bg-orange-500" },
};

const prioriteitDot = (p: number) => p >= 4 ? "bg-red-500" : p >= 3 ? "bg-amber-400" : "bg-gray-300";

function OnderwerpCombobox({ waarde, opties, onChange, disabled }: {
  waarde: string; opties: string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [tekst, setTekst] = useState(waarde);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setTekst(waarde); }, [waarde]);
  useEffect(() => {
    function buiten(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    return () => document.removeEventListener("mousedown", buiten);
  }, []);

  const gefilterd = opties.filter((o) => o.toLowerCase().includes(tekst.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-lg overflow-hidden ${disabled ? "bg-gray-100 border-gray-100" : "bg-gray-50 border-gray-200"}`}>
        <input
          value={tekst}
          onChange={(e) => { setTekst(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder={disabled ? "Kies eerst een hoofdthema" : "Zoek op subthema..."}
          disabled={disabled}
          className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-700 outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        {waarde && <button onClick={() => { setTekst(""); onChange(""); }} className="px-2 text-gray-400 hover:text-gray-600">✕</button>}
      </div>
      {open && gefilterd.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {gefilterd.map((o) => (
            <button key={o} onMouseDown={() => { onChange(o); setTekst(o); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${waarde === o ? "font-semibold text-gray-900" : "text-gray-700"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Redactiedashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [onderwerpen, setOnderwerpen] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [spam, setSpam] = useState(false);
  const [zoekterm, setZoekterm] = useState("");
  const [filterHoofdthema, setFilterHoofdthema] = useState<Hoofdthema | "">("");
  const [filterOnderwerp, setFilterOnderwerp] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [sortBy, setSortBy] = useState<"datum" | "prioriteit">("datum");

  useEffect(() => {
    const params = new URLSearchParams({ tenant_id: TENANT_ID });
    if (filterHoofdthema) params.set("hoofdthema", filterHoofdthema);
    fetch(`/api/onderwerpen?${params}`)
      .then((r) => r.json())
      .then((d) => setOnderwerpen(Array.isArray(d) ? d : []))
      .catch(() => setOnderwerpen([]));
    setFilterOnderwerp("");
  }, [filterHoofdthema]);

  const laad = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tenant_id: TENANT_ID, spam: String(spam) });
    if (filterHoofdthema) params.set("hoofdthema", filterHoofdthema);
    if (filterOnderwerp) params.set("onderwerp", filterOnderwerp);
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    if (filterSentiment) params.set("sentiment", filterSentiment);
    try {
      const res = await fetch(`/api/submissions?${params}`);
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch {
      setSubmissions([]);
    }
    setLoading(false);
  }, [spam, filterHoofdthema, filterOnderwerp, filterType, filterStatus, filterSentiment]);

  useEffect(() => { laad(); }, [laad]);

  function wisFilters() {
    setFilterHoofdthema(""); setFilterOnderwerp(""); setFilterType("");
    setFilterStatus(""); setFilterSentiment(""); setZoekterm("");
  }

  async function updateStatus(id: string, status: Status) {
    await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates: { status } }),
    });
    setSubmissions((p) => p.map((s) => s.id === id ? { ...s, status } : s));
  }

  async function voegLabelToe(id: string, label: string, huidige: string[]) {
    if (!label.trim() || huidige.includes(label)) return;
    const nieuw = [...huidige, label];
    await fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates: { labels: nieuw } }),
    });
    setSubmissions((p) => p.map((s) => s.id === id ? { ...s, labels: nieuw } : s));
  }

  const gefilterd = submissions
    .filter((s) => {
      if (!zoekterm) return true;
      const q = zoekterm.toLowerCase();
      return s.naam?.toLowerCase().includes(q) || s.samenvatting.toLowerCase().includes(q) || s.onderwerp.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sortBy === "prioriteit"
        ? b.prioriteit - a.prioriteit
        : new Date(b.ingediend_op).getTime() - new Date(a.ingediend_op).getTime()
    );

  const geselecteerd = gefilterd.find((s) => s.id === open) ?? null;
  const actieveFilters = filterHoofdthema || filterOnderwerp || filterType || filterStatus || filterSentiment || zoekterm;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: tenant.kleur }} />
          <span className="font-semibold text-gray-900 text-sm">{tenant.naam} — Redactie</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-xs">ViewerPulse</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSpam(!spam); setOpen(null); }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${spam ? "border-red-300 text-red-600 bg-red-50" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            {spam ? "← Inbox" : "Spam"}
          </button>
          <a href="/" target="_blank" className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            Formulier ↗
          </a>
        </div>
      </header>

      {/* Hoofdthema chips */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0">
        <button onClick={() => { setFilterHoofdthema(""); setOpen(null); }}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${!filterHoofdthema ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          Alle thema&apos;s
        </button>
        {HOOFDTHEMAS.map((h) => {
          const k = hoofdthemaKleur[h];
          const actief = filterHoofdthema === h;
          return (
            <button key={h} onClick={() => { setFilterHoofdthema(actief ? "" : h); setOpen(null); }}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${actief ? `${k.activeBg} text-white` : `${k.bg} ${k.text} hover:opacity-80`}`}>
              {h}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100 space-y-2">

            {/* Type knoppen */}
            <div className="flex gap-1.5">
              {TYPE_KNOPPEN.map(({ label, waarde }) => (
                <button key={label} onClick={() => setFilterType(waarde)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${filterType === waarde ? "text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                  style={filterType === waarde ? { backgroundColor: tenant.kleur } : {}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Status knoppen */}
            <div className="flex gap-1.5">
              {(["", "concept", "klaar", "in_behandeling"] as const).map((st) => (
                <button key={st} onClick={() => setFilterStatus(st)}
                  className={`flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${filterStatus === st ? "text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                  style={filterStatus === st ? { backgroundColor: tenant.kleur } : {}}>
                  {st === "" ? "Alle" : STATUS_LABELS[st as Status]}
                </button>
              ))}
            </div>

            {/* Zoekbalk */}
            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
              <svg className="w-3.5 h-3.5 text-gray-400 ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={zoekterm} onChange={(e) => setZoekterm(e.target.value)}
                placeholder="Zoek op naam of inhoud..."
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-gray-700 outline-none" />
              {zoekterm && <button onClick={() => setZoekterm("")} className="px-2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>

            {/* Subthema + sortering */}
            <div className="flex gap-1.5">
              <div className="flex-1">
                <OnderwerpCombobox waarde={filterOnderwerp} opties={onderwerpen}
                  onChange={(v) => { setFilterOnderwerp(v); setOpen(null); }} disabled={!filterHoofdthema} />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "datum" | "prioriteit")}
                className="bg-gray-50 text-gray-700 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none">
                <option value="datum">Nieuwste</option>
                <option value="prioriteit">Prioriteit</option>
              </select>
            </div>

            {actieveFilters && (
              <button onClick={wisFilters} className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2">
                Filters wissen
              </button>
            )}
          </div>

          {/* Lijst */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Laden...</div>
            ) : gefilterd.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Geen inzendingen gevonden.</div>
            ) : gefilterd.map((s) => {
              const hk = s.hoofdthema ? hoofdthemaKleur[s.hoofdthema] : null;
              return (
                <button key={s.id} onClick={() => setOpen(s.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-gray-50 ${open === s.id ? "bg-gray-50 border-l-2" : ""}`}
                  style={open === s.id ? { borderLeftColor: tenant.kleur } : {}}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${prioriteitDot(s.prioriteit)}`} />
                      <span className="text-xs font-semibold text-gray-800 truncate">{s.naam ?? "Anoniem"}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                      {new Date(s.ingediend_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {s.hoofdthema && hk && (
                    <div className="mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${hk.bg} ${hk.text}`}>{s.hoofdthema}</span>
                      <span className="text-[10px] text-gray-400 ml-1">/ {s.onderwerp}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.samenvatting}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${statusBadge[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${typeBadge[s.type]}`}>
                      {typeLabel[s.type]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
            {gefilterd.length} van {submissions.length} inzending{submissions.length !== 1 ? "en" : ""}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!geselecteerd ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Selecteer een inzending</p>
              </div>
            </div>
          ) : (
            <DetailPanel
              submission={geselecteerd}
              tenantKleur={tenant.kleur}
              onStatusChange={updateStatus}
              onLabelAdd={voegLabelToe}
              onHoofdthemaFilter={(h) => { setFilterHoofdthema(h); setOpen(null); }}
              onOnderwerpFilter={(o) => { setFilterOnderwerp(o); setOpen(null); }}
              onReanalyzed={(id, updates) => setSubmissions((p) => p.map((s) => s.id === id ? { ...s, ...updates } : s))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function parseConversatie(volledige: string): Array<{ van: "kijker" | "formulier"; tekst: string }> {
  if (!volledige) return [];
  const berichten: Array<{ van: "kijker" | "formulier"; tekst: string }> = [];
  let huidigVan: "kijker" | "formulier" | null = null;
  let huidigTekst: string[] = [];
  for (const regel of volledige.split("\n")) {
    if (regel.startsWith("Kijker: ")) {
      if (huidigVan) berichten.push({ van: huidigVan, tekst: huidigTekst.join("\n").trim() });
      huidigVan = "kijker"; huidigTekst = [regel.slice(8)];
    } else if (regel.startsWith("Formulier: ")) {
      if (huidigVan) berichten.push({ van: huidigVan, tekst: huidigTekst.join("\n").trim() });
      huidigVan = "formulier"; huidigTekst = [regel.slice(11)];
    } else {
      huidigTekst.push(regel);
    }
  }
  if (huidigVan) berichten.push({ van: huidigVan, tekst: huidigTekst.join("\n").trim() });
  return berichten;
}

function ChatInterface({ submission }: { submission: Submission }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [bericht, setBericht] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [bevestigd, setBevestigd] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/replies?submission_id=${submission.id}`)
      .then((r) => r.json())
      .then((d) => setReplies(Array.isArray(d) ? d : []))
      .catch(() => setReplies([]));
  }, [submission.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  async function haalSuggestieOp() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const { suggestie } = await res.json();
      if (suggestie) setBericht(suggestie);
    } catch {
      // stilletjes falen, textarea blijft leeg
    }
    setSuggesting(false);
  }

  async function verstuur() {
    if (!bericht.trim()) return;
    setSending(true);
    const res = await fetch("/api/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submission.id, bericht }),
    });
    const nieuw = await res.json();
    setReplies((p) => [...p, nieuw]);
    setBericht("");
    setBevestigd(true);
    setTimeout(() => setBevestigd(false), 3000);
    setSending(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gesprek</h3>
        {submission.email && (
          <span className="text-[10px] text-gray-400">Reacties gaan naar {submission.email}</span>
        )}
      </div>

      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {/* Volledige conversatie van kijker (inclusief doorvragen) */}
        {parseConversatie(submission.volledige_context || submission.origineel_bericht).map((m, i) => (
          m.van === "kijker" ? (
            <div key={i} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
                {submission.naam ? submission.naam.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1">
                {i === 0 && (
                  <div className="text-[10px] text-gray-400 mb-1">
                    {submission.naam ?? "Anoniem"} · {new Date(submission.ingediend_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {m.tekst}
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-center">
              <div className="text-[11px] text-gray-400 italic bg-gray-50 rounded-lg px-3 py-1.5 max-w-[85%] text-center">
                ↩ {m.tekst}
              </div>
            </div>
          )
        ))}

        {/* Redactie replies */}
        {replies.map((r) => (
          <div key={r.id} className="flex gap-2.5 flex-row-reverse">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-white" style={{ backgroundColor: tenant.kleur }}>
              R
            </div>
            <div className="flex-1 flex flex-col items-end">
              <div className="text-[10px] text-gray-400 mb-1">Redactie · {new Date(r.verzonden_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed max-w-[85%]" style={{ backgroundColor: tenant.kleur }}>
                {r.bericht}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 space-y-2">
        <button
          onClick={haalSuggestieOp}
          disabled={suggesting || sending}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40 flex items-center gap-1"
        >
          {suggesting ? (
            <span className="animate-pulse">Suggestie genereren...</span>
          ) : (
            <><span>✦</span> Stel antwoord voor</>
          )}
        </button>
        {bevestigd && (
          <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Bericht opgeslagen{submission.email ? ` — kijker ontvangt dit via ${submission.email}` : ""}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={bericht}
            onChange={(e) => setBericht(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) verstuur(); }}
            placeholder="Schrijf een reactie naar de kijker..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none focus:border-gray-400 min-h-[72px]"
            disabled={sending}
          />
          <button
            onClick={verstuur}
            disabled={sending || !bericht.trim()}
            className="px-4 py-2 text-white text-sm font-medium rounded-xl self-end disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: tenant.kleur }}
          >
            {sending ? "..." : "Stuur →"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">Cmd+Enter om te versturen</p>
      </div>
    </div>
  );
}

function DetailPanel({ submission: s, tenantKleur, onStatusChange, onLabelAdd, onHoofdthemaFilter, onOnderwerpFilter, onReanalyzed }: {
  submission: Submission; tenantKleur: string;
  onStatusChange: (id: string, status: Status) => void;
  onLabelAdd: (id: string, label: string, huidige: string[]) => void;
  onHoofdthemaFilter: (h: Hoofdthema) => void;
  onOnderwerpFilter: (o: string) => void;
  onReanalyzed: (id: string, updates: Partial<Submission>) => void;
}) {
  const [labelInput, setLabelInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const hk = s.hoofdthema ? hoofdthemaKleur[s.hoofdthema] : null;

  async function heranalyseer() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id }),
      });
      if (res.ok) {
        const updates = await res.json();
        onReanalyzed(s.id, updates);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        {s.hoofdthema && hk && (
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => onHoofdthemaFilter(s.hoofdthema!)}
              className={`px-2 py-1 rounded-lg font-medium hover:opacity-70 transition-opacity ${hk.bg} ${hk.text}`}>
              {s.hoofdthema}
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => onOnderwerpFilter(s.onderwerp)}
              className="text-gray-500 hover:text-gray-800 hover:underline underline-offset-2">
              {s.onderwerp}
            </button>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{s.onderwerp}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(s.ingediend_op).toLocaleString("nl-NL")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${typeBadge[s.type]}`}>{typeLabel[s.type]}</span>
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${sentimentBadge[s.sentiment]}`}>{s.sentiment}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Prioriteit</span>
          <div className="flex gap-1">
            {[1,2,3,4,5].map((n) => (
              <div key={n} className={`h-1.5 w-6 rounded-full ${n <= s.prioriteit ? (s.prioriteit >= 4 ? "bg-red-400" : s.prioriteit >= 3 ? "bg-amber-400" : "bg-gray-300") : "bg-gray-100"}`} />
            ))}
          </div>
          <span className="text-xs text-gray-400">{s.prioriteit}/5</span>
          {s.fase && (
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
              s.fase === "AFRONDING" ? "bg-green-50 text-green-700" :
              s.fase === "CONTACT"   ? "bg-blue-50 text-blue-700" :
                                       "bg-amber-50 text-amber-700"
            }`}>{s.fase}</span>
          )}
        </div>
        {s.volgende_stap && (
          <p className="text-xs text-gray-500 italic">→ {s.volgende_stap}</p>
        )}
      </div>

      {/* AI Samenvatting */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Samenvatting</h3>
          {s.samenvatting === "Analyse niet beschikbaar." && (
            <button
              onClick={heranalyseer}
              disabled={analyzing}
              className="text-xs px-3 py-1 rounded-lg font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: tenantKleur }}
            >
              {analyzing ? "Bezig..." : "↻ Analyseer opnieuw"}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{s.samenvatting}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {s.trefwoorden.map((t) => (
            <span key={t} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {/* Contact */}
      {(s.naam || s.email || s.telefoonnummer) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h3>
          <div className="space-y-2.5">
            {s.naam && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white" style={{ backgroundColor: tenantKleur }}>
                  {s.naam.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{s.naam}</span>
              </div>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm text-blue-600 group-hover:underline">{s.email}</span>
              </a>
            )}
            {s.telefoonnummer && (
              <a href={`tel:${s.telefoonnummer}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span className="text-sm text-blue-600 group-hover:underline">{s.telefoonnummer}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Chat */}
      <ChatInterface submission={s} />

      {/* Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</h3>
        <div className="flex flex-wrap gap-2">
          {(["concept", "klaar", "in_behandeling", "afgehandeld", "gearchiveerd"] as Status[]).map((st) => (
            <button key={st} onClick={() => onStatusChange(s.id, st)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${s.status === st ? "border-transparent text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              style={s.status === st ? { backgroundColor: tenantKleur } : {}}>
              {STATUS_LABELS[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Labels</h3>
        <div className="flex flex-wrap gap-1.5">
          {s.labels.map((l) => (
            <span key={l} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{l}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onLabelAdd(s.id, labelInput, s.labels); setLabelInput(""); } }}
            placeholder="Label toevoegen..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-400" />
          <button onClick={() => { onLabelAdd(s.id, labelInput, s.labels); setLabelInput(""); }}
            className="text-xs px-3 py-1.5 text-white rounded-lg font-medium"
            style={{ backgroundColor: tenantKleur }}>
            Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}
