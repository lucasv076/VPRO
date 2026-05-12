import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalyzeResult, FormMessage, Submission, HOOFDTHEMAS } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Veilige fallback als Gemini onverwacht output geeft
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
};

export async function analyzeSubmission(tekst: string): Promise<AnalyzeResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een assistent die kijkersinzendingen verwerkt voor een Nederlandse omroep.
Analyseer de inzending en geef een JSON-object terug.

Regels:
- is_spam: true als het nep, reclame, betekenisloos of automatisch gegenereerd is
- hoofdthema: kies EXACT één van deze zeven waarden:
  "Gezondheid en zorg" | "Werk en geld" | "Recht en onrecht" | "Wonen en leefomgeving" | "Onderwijs en jeugd" | "Klimaat en duurzaamheid" | "Misinformatie en privacy"
- type: "vraag" | "klacht" | "tip" | "ervaring" | "overig"
- onderwerp: specifiek subthema binnen het hoofdthema (max 3 woorden, Nederlands)
- samenvatting: neutrale kern in 2-3 zinnen
- sentiment: "positief" | "neutraal" | "negatief"
- prioriteit: 1 (laag) t/m 5 (hoog), op basis van urgentie of maatschappelijke waarde
- trefwoorden: 3-5 relevante trefwoorden
- compleetheid_score: 1-10, hoe bruikbaar is dit voor de redactie
- followup_vraag: één gerichte vervolgvraag als de score onder 6 is EN er iets cruciaal mist, anders null`,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  try {
    const result = await model.generateContent(tekst);
    return JSON.parse(result.response.text()) as AnalyzeResult;
  } catch (err) {
    console.error("analyzeSubmission fout:", err);
    return ANALYZE_FALLBACK;
  }
}

export async function getFollowupQuestion(
  conversation: FormMessage[],
  currentText: string
): Promise<string | null> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een slim formulier-assistent voor een Nederlandse omroep.
Een kijker heeft een bericht ingestuurd. Beoordeel of er één specifiek gegeven mist dat de redactie écht nodig heeft.

Regels:
- Stel ALLEEN een vraag als er iets cruciaal ontbreekt (programmanaam, context, wat ze verwachten)
- Als het bericht al voldoende info heeft, stuur dan exact: NULL
- Maximaal vriendelijke, korte vraag in het Nederlands
- Nooit meer dan één vraag tegelijk
- Stuur ALLEEN de vraag als tekst, of het woord NULL`,
  });

  const history = conversation.map((m) => ({
    role: m.role === "assistant" ? "model" : "user" as "user" | "model",
    parts: [{ text: m.content }],
  }));

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(currentText);
    const antwoord = result.response.text().trim();
    return antwoord === "NULL" ? null : antwoord;
  } catch {
    return null;
  }
}

// Genereert een conceptreactie voor de redacteur op basis van de inzending
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
    const result = await model.generateContent(context);
    return result.response.text().trim();
  } catch {
    const naam = submission.naam ?? "kijker";
    return `Beste ${naam},\n\nBedankt voor uw bericht over ${submission.onderwerp}. We hebben uw inzending ontvangen en nemen dit mee in onze redactionele afweging. U ontvangt van ons bericht zodra er meer nieuws is.\n\nMet vriendelijke groet,\nDe redactie`;
  }
}
