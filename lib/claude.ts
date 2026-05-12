import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalyzeResult, FormMessage, Submission, HOOFDTHEMAS } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Wacht ms milliseconden — gebruikt bij retry
const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Probeert fn() maximaal twee keer; wacht 2s tussen pogingen
async function metRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn("Gemini fout, opnieuw proberen over 2s:", err);
    await wacht(2000);
    return await fn();
  }
}

const ANALYZE_FALLBACK: AnalyzeResult = {
  is_spam: false,
  hoofdthema: HOOFDTHEMAS[0],
  type: "overig",
  onderwerp: "onbekend",
  samenvatting: "Analyse niet beschikbaar.",
  sentiment: "neutraal",
  prioriteit: 1,
  trefwoorden: [],
  compleetheid_score: 1,
  followup_vraag: null,
  fase: "INHOUD",
  volgende_stap: "Neem contact op met de kijker voor meer informatie.",
};


export async function analyzeSubmission(tekst: string): Promise<AnalyzeResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een assistent die kijkersinzendingen verwerkt voor een Nederlandse omroep.
Analyseer de inzending en geef ALLEEN een geldig JSON-object terug, zonder uitleg of markdown.

Spam-regels (is_spam: true):
- Minder dan 3 betekenisvolle woorden (bijv. "hoi", "test", "hallo", "ok")
- Volledig irrelevant voor een omroep (bijv. "ik heb honger", "wat is het weer?")
- Nep, reclame of automatisch gegenereerd

Fasen (fase):
- "INHOUD": de 5 W's (Wie, Wat, Waar, Wanneer, Waarom) zijn nog niet compleet
- "CONTACT": inhoud is helder, contactgegevens ontbreken nog
- "AFRONDING": alles bekend, inzending is compleet en bruikbaar

Overige velden:
- hoofdthema: EXACT één van: "Gezondheid en zorg" | "Werk en geld" | "Recht en onrecht" | "Wonen en leefomgeving" | "Onderwijs en jeugd" | "Klimaat en duurzaamheid" | "Misinformatie en privacy"
- type: "vraag" | "klacht" | "tip" | "ervaring" | "overig"
- onderwerp: specifiek subthema binnen het hoofdthema (max 3 woorden, Nederlands)
- samenvatting: neutrale kern in 2-3 zinnen
- sentiment: "positief" | "neutraal" | "negatief"
- prioriteit: 1 (laag) t/m 5 (hoog)
- trefwoorden: 3-5 relevante trefwoorden
- compleetheid_score: 1-10
- followup_vraag: één gerichte vervolgvraag als score onder 6 EN er iets cruciaal mist, anders null
- volgende_stap: korte instructie voor de redacteur wat nu te doen (max 1 zin)`,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  try {
    const result = await metRetry(() => model.generateContent(tekst));
    return JSON.parse(result.response.text()) as AnalyzeResult;
  } catch (err) {
    console.error("analyzeSubmission definitief mislukt:", err);
    return ANALYZE_FALLBACK;
  }
}

// Combineert doorvraag + typedetectie + spam-check in één AI-call
export async function analyzeForForm(
  currentText: string,
  conversation: FormMessage[] = []
): Promise<{ followup: string | null; suggestedType: string | null }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een assistent voor een journalistiek platform.
Analyseer het bericht van een kijker en geef JSON terug met twee velden.

Spam-check (eerst):
- Als het bericht minder dan 3 betekenisvolle woorden heeft OF volledig irrelevant is voor een omroep:
  Geef followup: "Dit platform is bedoeld voor journalistieke tips en ervaringen. Waarover wilt u een melding doen?" en suggestedType: null

5 W's (Wie, Wat, Waar, Wanneer, Waarom):
- Als het bericht relevante journalistieke inhoud heeft maar één of meer van de 5 W's ontbreken:
  Stel één gerichte vraag om de meest cruciale ontbrekende W op te halen.
- Als alle relevante W's al bekend zijn: geef followup: null

Typedetectie (suggestedType):
- "tip"       – iets gezien/meegemaakt dat onderzocht moet worden
- "ervaring"  – persoonlijke beleving of verhaal
- "feedback"  – correctie of kritiek op berichtgeving
- "vraag"     – vraag over onderwerp of redactie
- "opmerking" – algemeen compliment of opmerking

Geef ALLEEN geldig JSON: {"followup": "..." of null, "suggestedType": "..." of null}`,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const context = conversation.length > 0
    ? conversation.map((m) => `${m.role === "user" ? "Kijker" : "Assistent"}: ${m.content}`).join("\n") + "\n"
    : "";

  try {
    const result = await metRetry(() => model.generateContent(`${context}Kijker: ${currentText}`));
    const parsed = JSON.parse(result.response.text()) as { followup?: string | null; suggestedType?: string | null };
    return {
      followup: parsed.followup && parsed.followup !== "NULL" ? parsed.followup : null,
      suggestedType: parsed.suggestedType ?? null,
    };
  } catch (err) {
    console.error("analyzeForForm definitief mislukt:", err);
    return { followup: null, suggestedType: null };
  }
}

export async function suggesteerAntwoord(submission: Submission): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een redacteur bij een Nederlandse publieke omroep.
Schrijf een professionele, vriendelijke reactie naar een kijker die een bericht heeft ingediend.

Regels:
- Spreek de kijker persoonlijk aan bij naam als je die hebt, anders "Beste kijker"
- Bevestig dat je het bericht ontvangen hebt en benoem kort het onderwerp
- Geef aan wat de redactie ermee gaat doen (onderzoek, opvolging, doorsturen etc.)
- Sluit vriendelijk en professioneel af
- Maximaal 4-5 zinnen, warm maar zakelijk
- Schrijf ALLEEN de reactietekst zelf, geen onderwerpregel of meta-informatie`,
  });

  const context = [
    `Naam kijker: ${submission.naam ?? "onbekend"}`,
    `Hoofdthema: ${submission.hoofdthema ?? "onbekend"}`,
    `Onderwerp: ${submission.onderwerp}`,
    `Type inzending: ${submission.type}`,
    `Origineel bericht: ${submission.origineel_bericht}`,
    `AI samenvatting: ${submission.samenvatting}`,
  ].join("\n");

  try {
    const result = await metRetry(() => model.generateContent(context));
    return result.response.text().trim();
  } catch {
    const naam = submission.naam ?? "kijker";
    return `Beste ${naam},\n\nBedankt voor uw bericht over ${submission.onderwerp}. We hebben uw inzending ontvangen en nemen dit mee in onze redactionele afweging. U ontvangt van ons bericht zodra er meer nieuws is.\n\nMet vriendelijke groet,\nDe redactie`;
  }
}
