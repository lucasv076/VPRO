import { NextRequest, NextResponse } from "next/server";
import { getFollowupQuestion } from "@/lib/claude";
import { FormMessage } from "@/types";

export async function POST(req: NextRequest) {
  const { messages, currentText } = await req.json() as {
    messages: FormMessage[];
    currentText: string;
  };

  const followup = await getFollowupQuestion(messages, currentText);
  return NextResponse.json({ followup });
}
