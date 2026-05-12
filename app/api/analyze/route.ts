import { NextRequest, NextResponse } from "next/server";
import { analyzeForForm } from "@/lib/claude";
import { FormMessage } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentText } = await req.json() as {
      messages: FormMessage[];
      currentText: string;
    };

    const result = await analyzeForForm(currentText, messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze error:", err);
    return NextResponse.json({ followup: null, suggestedType: null }, { status: 500 });
  }
}
