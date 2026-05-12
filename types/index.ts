export type SubmissionType = "vraag" | "klacht" | "tip" | "ervaring" | "overig";
export type Sentiment = "positief" | "neutraal" | "negatief";
export type RoutingStatus = "spam" | "concept" | "klaar";
export type Status = "spam" | "concept" | "klaar" | "nieuw" | "in_behandeling" | "afgehandeld" | "gearchiveerd";

export const HOOFDTHEMAS = [
  "Gezondheid en zorg",
  "Werk en geld",
  "Recht en onrecht",
  "Wonen en leefomgeving",
  "Onderwijs en jeugd",
  "Klimaat en duurzaamheid",
  "Misinformatie en privacy",
] as const;

export type Hoofdthema = typeof HOOFDTHEMAS[number];

export type Fase = "INHOUD" | "CONTACT" | "AFRONDING";

export interface AnalyzeResult {
  is_spam: boolean;
  routing_status: RoutingStatus;
  hoofdthema: Hoofdthema;
  type: SubmissionType;
  onderwerp: string;
  samenvatting: string;
  sentiment: Sentiment;
  prioriteit: number;
  trefwoorden: string[];
  compleetheid_score: number;
  followup_vraag: string | null;
  fase: Fase;
  volgende_stap: string;
}

export interface Submission {
  id: string;
  tenant_id: string;
  naam: string | null;
  email: string | null;
  telefoonnummer: string | null;
  origineel_bericht: string;
  volledige_context: string;
  is_spam: boolean;
  hoofdthema: Hoofdthema | null;
  type: SubmissionType;
  onderwerp: string;
  samenvatting: string;
  sentiment: Sentiment;
  prioriteit: number;
  trefwoorden: string[];
  compleetheid_score: number;
  fase: Fase | null;
  volgende_stap: string | null;
  status: Status;
  labels: string[];
  ingediend_op: string;
}

export interface FormMessage {
  role: "user" | "assistant";
  content: string;
}
