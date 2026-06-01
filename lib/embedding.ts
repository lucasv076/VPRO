export async function generateEmbedding(tekst: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: tekst }] },
    }),
  });

  if (!response.ok) {
    const fout = await response.text();
    throw new Error(`Embedding API fout ${response.status}: ${fout}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}
