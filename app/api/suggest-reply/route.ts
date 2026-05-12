import { NextRequest, NextResponse } from "next/server";
import { suggesteerAntwoord } from "@/lib/claude";
import { Submission } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const submission = await req.json() as Submission;
    const suggestie = await suggesteerAntwoord(submission);
    return NextResponse.json({ suggestie });
  } catch (err) {
    console.error("suggest-reply error:", err);
    return NextResponse.json({ error: "Kon geen suggestie genereren" }, { status: 500 });
  }
}
