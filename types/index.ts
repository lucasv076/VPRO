export type SubmissionType = "vraag" | "klacht" | "tip" | "ervaring" | "overig";
export type Sentiment = "positief" | "neutraal" | "negatief";
export type Status = "nieuw" | "in_behandeling" | "afgehandeld" | "gearchiveerd";

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

export interface AnalyzeResult {
  is_spam: boolean;
  hoofdthema: Hoofdthema;
  type: SubmissionType;
  onderwerp: string;
  samenvatting: string;
  sentiment: Sentiment;
  prioriteit: number;
  trefwoorden: string[];
  compleetheid_score: number;
  followup_vraag: string | null;
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
  status: Status;
  labels: string[];
  ingediend_op: string;
}

export interface FormMessage {
  role: "user" | "assistant";
  content: string;
}
