"use client";

import { useState, useRef, useEffect } from "react";
import { FormMessage } from "@/types";
import { tenants, defaultTenant } from "@/lib/tenants";

const TENANT_ID = "vpro";
const tenant = tenants[TENANT_ID] ?? defaultTenant;
const MAX_FOLLOWUPS = 2;

export default function InstuurFormulier() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [bericht, setBericht] = useState("");
  const [followupVraag, setFollowupVraag] = useState<string | null>(null);
  const [followupAntwoord, setFollowupAntwoord] = useState("");
  const [messages, setMessages] = useState<FormMessage[]>([]);
  const [followupCount, setFollowupCount] = useState(0);
  const [fase, setFase] = useState<"invullen" | "followup" | "verzenden" | "klaar">("invullen");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [bericht]);

  function valideer() {
    const e: Record<string, string> = {};
    if (!naam.trim()) e.naam = "Naam is verplicht";
    if (!email.trim()) e.email = "E-mailadres is verplicht";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Vul een geldig e-mailadres in";
    if (!bericht.trim()) e.bericht = "Vul je bericht in";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleVerstuur() {
    if (!valideer()) return;
    setLoading(true);

    const nieuweMessages: FormMessage[] = [{ role: "user", content: bericht }];
    setMessages(nieuweMessages);

    if (followupCount < MAX_FOLLOWUPS) {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], currentText: bericht }),
      });
      const data = await res.json();

      if (data.followup) {
        setFollowupVraag(data.followup);
        setFase("followup");
        setLoading(false);
        return;
      }
    }

    await verstuur(nieuweMessages);
  }

  async function handleFollowupVerstuur(overslaan = false) {
    const bijgewerkt: FormMessage[] = overslaan || !followupAntwoord.trim()
      ? messages
      : [
          ...messages,
          { role: "assistant", content: followupVraag! },
          { role: "user", content: followupAntwoord },
        ];

    const nieuweCount = followupCount + 1;
    setFollowupCount(nieuweCount);
    setMessages(bijgewerkt);
    setLoading(true);

    if (!overslaan && followupAntwoord.trim() && nieuweCount < MAX_FOLLOWUPS) {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: bijgewerkt, currentText: followupAntwoord }),
      });
      const data = await res.json();

      if (data.followup) {
        setFollowupVraag(data.followup);
        setFollowupAntwoord("");
        setLoading(false);
        return;
      }
    }

    await verstuur(bijgewerkt);
  }

  async function verstuur(msgs: FormMessage[]) {
    setFase("verzenden");
    await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: msgs,
        tenantId: TENANT_ID,
        naam,
        email,
        telefoonnummer: telefoon,
      }),
    });
    setFase("klaar");
    setLoading(false);
  }

  if (fase === "klaar") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100 space-y-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: tenant.kleur }}
          >
            <svg className="w-7 h-7" style={{ color: tenant.tekstKleur }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bedankt, {naam.split(" ")[0]}!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            We hebben je bericht ontvangen. De redactie neemt dit mee in hun werk.<br />
            Als we meer informatie nodig hebben, nemen we contact op via <strong>{email}</strong>.
          </p>
          <button
            onClick={() => {
              setFase("invullen");
              setNaam(""); setEmail(""); setTelefoon(""); setBericht("");
              setFollowupVraag(null); setFollowupAntwoord("");
              setFollowupCount(0); setMessages([]);
            }}
            className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Nog een bericht insturen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded" style={{ backgroundColor: tenant.kleur }} />
          <span className="font-bold text-gray-900">{tenant.naam}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Links: intro */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            {tenant.intro}
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">{tenant.subIntro}</p>

          <div className="space-y-3 pt-2">
            {[
              "Jouw bericht wordt direct gelezen door de redactie",
              "Vertrouwelijk — we delen nooit je gegevens",
              "We nemen contact op als we meer weten",
            ].map((tekst) => (
              <div key={tekst} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: tenant.kleur }}>
                  <svg className="w-3 h-3" style={{ color: tenant.tekstKleur }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-600 text-sm">{tekst}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rechts: formulier */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Deel jouw ervaring</h2>

          {/* Contactvelden */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naam <span className="text-red-400">*</span>
              </label>
              <input
                value={naam}
                onChange={(e) => { setNaam(e.target.value); setErrors((p) => ({ ...p, naam: "" })); }}
                placeholder="Voor- en achternaam"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
                  errors.naam ? "border-red-300 bg-red-50" : "border-gray-200 focus:border-gray-400"
                }`}
              />
              {errors.naam && <p className="text-xs text-red-500 mt-1">{errors.naam}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                placeholder="jouw@email.nl"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${
                  errors.email ? "border-red-300 bg-red-50" : "border-gray-200 focus:border-gray-400"
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefoonnummer <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                type="tel"
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                placeholder="06 12345678"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* Bericht */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jouw bericht <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={textareaRef}
                value={bericht}
                onChange={(e) => { setBericht(e.target.value); setErrors((p) => ({ ...p, bericht: "" })); }}
                placeholder="Schrijf hier je ervaring, vraag of tip..."
                disabled={fase === "followup" || loading}
                className={`w-full border rounded-xl px-4 py-3 text-sm resize-none min-h-[120px] outline-none transition-colors ${
                  errors.bericht ? "border-red-300 bg-red-50" : "border-gray-200 focus:border-gray-400"
                } disabled:bg-gray-50 disabled:text-gray-400`}
              />
              {errors.bericht && <p className="text-xs text-red-500 mt-1">{errors.bericht}</p>}
            </div>

            {/* Follow-up vraag */}
            {fase === "followup" && followupVraag && (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: `${tenant.kleur}18` }}>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center" style={{ backgroundColor: tenant.kleur }}>
                    <span className="text-[10px] font-bold" style={{ color: tenant.tekstKleur }}>?</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{followupVraag}</p>
                </div>
                <textarea
                  value={followupAntwoord}
                  onChange={(e) => setFollowupAntwoord(e.target.value)}
                  placeholder="Je antwoord (optioneel — je kunt ook direct insturen)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none min-h-[80px] outline-none focus:border-gray-400 transition-colors"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-1">
            {fase === "followup" && (
              <button
                onClick={() => handleFollowupVerstuur(true)}
                disabled={loading}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-40"
              >
                Overslaan
              </button>
            )}
            <button
              onClick={fase === "invullen" ? handleVerstuur : () => handleFollowupVerstuur(false)}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              style={{
                backgroundColor: tenant.kleur,
                color: tenant.tekstKleur,
              }}
            >
              {loading ? "Bezig..." : fase === "followup" ? "Insturen →" : "Verstuur →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
