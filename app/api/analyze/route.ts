import { NextRequest, NextResponse } from "next/server";
import { getFollowupQuestion } from "@/lib/claude";
import { FormMessage } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentText } = await req.json() as {
      messages: FormMessage[];
      currentText: string;
    };

    const followup = await getFollowupQuestion(messages, currentText);
    return NextResponse.json({ followup });
  } catch (err) {
    console.error("analyze error:", err);
    return NextResponse.json({ followup: null }, { status: 500 });
  }
}
