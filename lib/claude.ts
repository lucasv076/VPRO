import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalyzeResult, FormMessage } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

function schoonJSON(tekst: string): string {
  return tekst.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

export async function analyzeSubmission(tekst: string): Promise<AnalyzeResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Je bent een assistent die kijkersinzendingen verwerkt voor een Nederlandse omroep.
Analyseer de inzending en geef ALLEEN een geldig JSON-object terug, zonder uitleg of markdown.

Regels:
- is_spam: true als het nep, reclame, betekenisloos of automatisch gegenereerd is
- hoofdthema: kies EXACT één van deze zeven hoofdthema's op basis van de inhoud:
  "Gezondheid en zorg" | "Werk en geld" | "Recht en onrecht" | "Wonen en leefomgeving" | "Onderwijs en jeugd" | "Klimaat en duurzaamheid" | "Misinformatie en privacy"
- type: "vraag" | "klacht" | "tip" | "ervaring" | "overig"
- onderwerp: specifiek subthema binnen het hoofdthema (max 3 woorden, Nederlands)
- samenvatting: neutrale kern in 2-3 zinnen
- sentiment: "positief" | "neutraal" | "negatief"
- prioriteit: 1 (laag) t/m 5 (hoog), op basis van urgentie of maatschappelijke waarde
- trefwoorden: 3-5 relevante trefwoorden
- compleetheid_score: 1-10, hoe bruikbaar is dit voor de redactie
- followup_vraag: één gerichte vervolgvraag als de score onder 6 is EN er echt iets cruciaal mist, anders null`,
  });

  const result = await model.generateContent(tekst);
  const tekst_raw = result.response.text();
  return JSON.parse(schoonJSON(tekst_raw)) as AnalyzeResult;
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

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(currentText);
  const antwoord = result.response.text().trim();
  return antwoord === "NULL" ? null : antwoord;
}
