import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY!;

  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`;
  const listRes = await fetch(listUrl);
  const listData = await listRes.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };

  const embeddingModellen = (listData.models || []).filter(
    (m) => m.supportedGenerationMethods?.includes("embedContent")
  );

  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;
  const testRes = await fetch(testUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text: "test" }] } }),
  });
  const testData = await testRes.json();

  return NextResponse.json({
    embeddingModellen: embeddingModellen.map((m) => m.name),
    testStatus: testRes.status,
    testResult: testData,
  });
}
