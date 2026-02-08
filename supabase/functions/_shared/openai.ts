const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";

/**
 * Generate an embedding vector (1536 dims) using OpenRouter.
 * OpenRouter proxies the OpenAI embeddings API with the same format.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY env var");
  }

  // Truncate to ~8000 tokens worth of chars to stay within model limits
  const truncated = text.slice(0, 30000);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: truncated,
      model: MODEL,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter embedding error (${response.status}): ${err}`);
  }

  const json = await response.json();
  return json.data[0].embedding;
}
