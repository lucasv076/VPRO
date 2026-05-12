"use client";

import { useState, useEffect, useRef } from "react";
import { FormMessage } from "@/types";
import { tenants, defaultTenant } from "@/lib/tenants";

const TENANT_ID = "vpro";
const tenant = tenants[TENANT_ID] ?? defaultTenant;

type SelectType = "tip" | "ervaring" | "feedback" | "vraag" | "opmerking";
type Fase =
  | "keuze"
  | "bericht"
  | "ai-bezig"
  | "ai-followup"
  | "bijlage-vraag"
  | "bijlage-upload"
  | "toestemming-vraag"
  | "feedback-updates"
  | "contact-form"
  | "verzenden"
  | "klaar";

interface ChatMsg {
  van: "bot" | "user";
  tekst: string;
  waarschuwing?: boolean;
}

const TYPE_KEUZE: { type: SelectType; label: string; kleur: string }[] = [
  { type: "tip",       label: "Tip",       kleur: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
  { type: "ervaring",  label: "Ervaring",  kleur: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { type: "feedback",  label: "Feedback",  kleur: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { type: "vraag",     label: "Vraag",     kleur: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { type: "opmerking", label: "Opmerking", kleur: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
];

const DB_TYPE: Record<SelectType, string> = {
  tip: "tip", ervaring: "ervaring", feedback: "klacht", vraag: "vraag", opmerking: "overig",
};

const OPENING: Record<SelectType, string> = {
  tip:       "Je wilt een tip geven. Vertel me meer:",
  ervaring:  "Je wilt een persoonlijke ervaring delen. Vertel me meer:",
  feedback:  "Je hebt feedback op onze berichtgeving. Vertel me meer:",
  vraag:     "Je hebt een vraag over dit onderwerp of over onze redactie. Stel hem hier:",
  opmerking: "Je wilt een algemene opmerking achterlaten. Schrijf hem hier:",
};

export default function InstuurFormulier() {
  const [gekozenType, setGekozenType] = useState<SelectType | null>(null);
  const [fase, setFase] = useState<Fase>("keuze");
  const [berichten, setBerichten] = useState<ChatMsg[]>([]);
  const [inputTekst, setInputTekst] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [aiMessages, setAiMessages] = useState<FormMessage[]>([]);
  const [aiFollowupVraag, setAiFollowupVraag] = useState<string | null>(null);
  const [botTypt, setBotTypt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [berichten, fase, botTypt]);

  useEffect(() => {
    if (fase === "bericht" || fase === "ai-followup") inputRef.current?.focus();
  }, [fase]);

  function voegBotToe(tekst: string, waarschuwing = false) {
    setBerichten(p => [...p, { van: "bot", tekst, waarschuwing }]);
  }
  function voegUserToe(tekst: string) {
    setBerichten(p => [...p, { van: "user", tekst }]);
  }
  async function botBericht(tekst: string) {
    setBotTypt(true);
    await new Promise(r => setTimeout(r, 350));
    setBotTypt(false);
    voegBotToe(tekst);
  }

  function kiesType(t: SelectType) {
    setGekozenType(t);
    const start: ChatMsg[] = [];
    if (t === "tip" || t === "ervaring") {
      start.push({ van: "bot", tekst: "Deel nooit gevoelige persoonsgegevens van anderen die niet relevant zijn voor het verhaal.", waarschuwing: true });
    }
    start.push({ van: "bot", tekst: OPENING[t] });
    setBerichten(start);
    setFase("bericht");
  }

  async function stuurBericht() {
    const tekst = inputTekst.trim();
    if (!tekst || !gekozenType) return;
    setInputTekst("");
    voegUserToe(tekst);
    const nieuweAiMsgs: FormMessage[] = [{ role: "user", content: tekst }];
    setAiMessages(nieuweAiMsgs);

    if (gekozenType === "tip" || gekozenType === "ervaring") {
      setFase("ai-bezig");
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [], currentText: tekst }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.followup) {
            setAiFollowupVraag(data.followup);
            voegBotToe(data.followup);
            setFase("ai-followup");
            return;
          }
        }
      } catch { /* ga door zonder follow-up */ }
      await vervolgNaHoofdBericht(gekozenType, nieuweAiMsgs);
    } else {
      await vervolgNaHoofdBericht(gekozenType, nieuweAiMsgs);
    }
  }

  async function stuurFollowup(overslaan = false) {
    if (!gekozenType) return;
    const tekst = inputTekst.trim();
    setInputTekst("");
    if (tekst && !overslaan) voegUserToe(tekst);
    const bijgewerkt: FormMessage[] = tekst && !overslaan
      ? [...aiMessages, { role: "assistant", content: aiFollowupVraag! }, { role: "user", content: tekst }]
      : aiMessages;
    setAiMessages(bijgewerkt);
    await vervolgNaHoofdBericht(gekozenType, bijgewerkt);
  }

  async function vervolgNaHoofdBericht(t: SelectType, msgs: FormMessage[]) {
    if (t === "tip") {
      await botBericht("Bedankt voor de tip. Heb je bestanden die je met ons wilt delen?");
      setFase("bijlage-vraag");
    } else if (t === "ervaring") {
      await botBericht("Wat waardevol dat je dit met ons deelt. Persoonlijke verhalen geven kleur aan het nieuws. Mogen we jouw ervaring (eventueel anoniem) gebruiken voor een vervolgverhaal?");
      setFase("toestemming-vraag");
    } else if (t === "feedback") {
      await botBericht("Bedankt voor je scherpe blik. We streven naar objectieve journalistiek en nemen je feedback serieus. Je opmerking is direct doorgezet naar de dienstdoende eindredactie. Wil je op de hoogte blijven van onze reactie hierop?");
      setFase("feedback-updates");
    } else if (t === "vraag") {
      await botBericht("Goede vraag. We proberen altijd hoor en wederhoor toe te passen.");
      await verstuur(msgs, t, null, null);
    } else {
      await botBericht("Wat ontzettend leuk om te horen! We delen je compliment met het team.");
      await verstuur(msgs, t, null, null);
    }
  }

  async function bijlageJa() {
    voegUserToe("Ja, ik heb bestanden.");
    await botBericht("Top! Voeg je bijlage hieronder toe:");
    setFase("bijlage-upload");
  }
  async function bijlageNee() {
    voegUserToe("Nee.");
    await botBericht("Mogen we in de toekomst contact met je opnemen voor diepgaand onderzoek?");
    setFase("toestemming-vraag");
  }
  async function bijlageKlaar() {
    voegUserToe("Bijlage toegevoegd.");
    await botBericht("Mogen we in de toekomst contact met je opnemen voor diepgaand onderzoek?");
    setFase("toestemming-vraag");
  }

  async function contactJa() {
    voegUserToe("Ja.");
    await botBericht("Bedankt! Een redacteur kijkt hiernaar. Laat je e-mailadres of telefoonnummer achter zodat we even kort kunnen sparren.");
    setFase("contact-form");
  }
  async function contactNee() {
    voegUserToe("Nee.");
    await botBericht("Dat begrijpen we. Bedankt voor het delen — dit helpt ons om de impact van dit onderwerp beter te begrijpen.");
    await verstuur(aiMessages, gekozenType!, null, null);
  }

  async function updatesJa() {
    voegUserToe("Ja.");
    await botBericht("Laat je e-mailadres achter zodat we je op de hoogte kunnen houden.");
    setFase("contact-form");
  }
  async function updatesNee() {
    voegUserToe("Nee.");
    await botBericht("Dat begrijpen we. Bedankt voor je feedback.");
    await verstuur(aiMessages, gekozenType!, null, null);
  }

  async function stuurContact() {
    if (!email.trim() && !telefoon.trim()) return;
    voegUserToe([email, telefoon].filter(Boolean).join(" · "));
    await botBericht("Bedankt! Een redacteur neemt zo snel mogelijk contact met je op.");
    await verstuur(aiMessages, gekozenType!, email || null, telefoon || null);
  }

  async function verstuur(msgs: FormMessage[], t: SelectType, e: string | null, tel: string | null) {
    setFase("verzenden");
    await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: msgs,
        tenantId: TENANT_ID,
        naam: null,
        email: e,
        telefoonnummer: tel,
        presetType: DB_TYPE[t],
      }),
    });
    setFase("klaar");
  }

  function opnieuw() {
    setGekozenType(null); setFase("keuze"); setBerichten([]);
    setInputTekst(""); setEmail(""); setTelefoon("");
    setAiMessages([]); setAiFollowupVraag(null);
  }

  const bezig = botTypt || fase === "ai-bezig" || fase === "verzenden";
  const gekozenKleur = TYPE_KEUZE.find(k => k.type === gekozenType);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded" style={{ backgroundColor: tenant.kleur }} />
          <span className="font-bold text-gray-900">{tenant.naam}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Intro */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">{tenant.intro}</h1>
          <p className="text-gray-500 text-lg leading-relaxed">{tenant.subIntro}</p>
          <div className="space-y-3 pt-2">
            {["Jouw bericht wordt direct gelezen door de redactie", "Vertrouwelijk — we delen nooit je gegevens", "Anoniem insturen is mogelijk"].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: tenant.kleur }}>
                  <svg className="w-3 h-3" style={{ color: tenant.tekstKleur }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-600 text-sm">{t}</span>
              </div>
            ))}
          </div>
          {gekozenKleur && (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium ${gekozenKleur.kleur}`}>
              {gekozenKleur.label}
            </span>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ minHeight: "460px" }}>

          {/* Type keuze */}
          {fase === "keuze" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 text-center mb-1">Waar wil je ons over vertellen?</h2>
              {TYPE_KEUZE.map(({ type: t, label, kleur }) => (
                <button key={t} onClick={() => kiesType(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${kleur}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Chat berichten */}
          {fase !== "keuze" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {berichten.map((m, i) => (
                  <div key={i} className={`flex ${m.van === "user" ? "justify-end" : "justify-start"}`}>
                    {m.van === "bot" && m.waarschuwing ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 max-w-[88%] leading-relaxed">
                        ⚠️ {m.tekst}
                      </div>
                    ) : m.van === "bot" ? (
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 max-w-[88%] leading-relaxed">
                        {m.tekst}
                      </div>
                    ) : (
                      <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[88%] leading-relaxed"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        {m.tekst}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {bezig && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}

                {fase === "klaar" && (
                  <div className="text-center pt-2">
                    <button onClick={opnieuw} className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2">
                      Nog een bericht insturen
                    </button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              {!bezig && (
                <div className="border-t border-gray-100 p-4">

                  {(fase === "bericht" || fase === "ai-followup") && (
                    <div className="space-y-2">
                      <textarea
                        ref={inputRef}
                        value={inputTekst}
                        onChange={(e) => setInputTekst(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            fase === "bericht" ? stuurBericht() : stuurFollowup();
                          }
                        }}
                        placeholder={fase === "ai-followup" ? "Je antwoord..." : "Schrijf hier je bericht..."}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white placeholder:text-gray-400 resize-none min-h-[90px] outline-none focus:border-gray-400 transition-colors"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        {fase === "ai-followup" && (
                          <button onClick={() => stuurFollowup(true)}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                            Overslaan
                          </button>
                        )}
                        <button
                          onClick={() => fase === "bericht" ? stuurBericht() : stuurFollowup()}
                          disabled={!inputTekst.trim()}
                          className="px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-40 transition-opacity"
                          style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                          Verstuur →
                        </button>
                      </div>
                    </div>
                  )}

                  {fase === "bijlage-vraag" && (
                    <div className="flex gap-2">
                      <button onClick={bijlageJa}
                        className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        Ja
                      </button>
                      <button onClick={bijlageNee}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        Nee
                      </button>
                    </div>
                  )}

                  {fase === "bijlage-upload" && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors group">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm text-gray-500">Klik om een bestand te kiezen...</span>
                        <input type="file" className="hidden" multiple />
                      </label>
                      <button onClick={bijlageKlaar}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        Doorgaan →
                      </button>
                    </div>
                  )}

                  {fase === "toestemming-vraag" && (
                    <div className="flex gap-2">
                      <button onClick={contactJa}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        Ja
                      </button>
                      <button onClick={contactNee}
                        className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        Nee
                      </button>
                    </div>
                  )}

                  {fase === "feedback-updates" && (
                    <div className="flex gap-2">
                      <button onClick={updatesJa}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        Ja
                      </button>
                      <button onClick={updatesNee}
                        className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        Nee
                      </button>
                    </div>
                  )}

                  {fase === "contact-form" && (
                    <div className="space-y-2">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-mailadres"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 outline-none focus:border-gray-400" />
                      <input type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)}
                        placeholder="Telefoonnummer (optioneel)"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 outline-none focus:border-gray-400" />
                      <button onClick={stuurContact} disabled={!email.trim() && !telefoon.trim()}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-40 transition-opacity"
                        style={{ backgroundColor: tenant.kleur, color: tenant.tekstKleur }}>
                        Verstuur →
                      </button>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
