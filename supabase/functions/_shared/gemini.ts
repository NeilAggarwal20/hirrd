const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

/**
 * Sends `prompt` to Gemini with JSON response mode enabled and parses
 * the result. Throws if the key isn't configured, the request fails,
 * or the model's output isn't valid JSON — callers should catch and
 * turn this into a clean error response.
 *
 * If the primary model responds with a 429 (quota/rate limit exceeded),
 * this function automatically retries using a fallback model.
 */
export async function callGeminiForJson(prompt: string): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const modelsToTry = [
    GEMINI_MODEL,
    ...(GEMINI_MODEL !== "gemini-2.5-flash" ? ["gemini-2.5-flash"] : []),
    ...(GEMINI_MODEL !== "gemini-flash-latest" ? ["gemini-flash-latest"] : []),
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 429) {
          throw new Error(`429: ${body}`);
        }
        throw new Error(`Gemini responded ${response.status}: ${body}`);
      }

      const json = await response.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      try {
        return JSON.parse(text);
      } catch {
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        return JSON.parse(cleaned);
      }
    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error && error.message.startsWith("429:")) {
        console.warn(`Model ${model} hit 429 quota/rate limit. Trying fallback model...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to call Gemini");
}

