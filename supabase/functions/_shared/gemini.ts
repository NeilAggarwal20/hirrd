const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL =
  Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";

export async function callGeminiForJson(prompt: string): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

const MAX_RETRIES = 5;

let response: Response | null = null;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  // Success
  if (response.ok) break;

  // Retry only on 503
  if (response.status === 503 && attempt < MAX_RETRIES) {
    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
    console.warn(
      `Gemini busy (503). Retry ${attempt}/${MAX_RETRIES} in ${delay} ms`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    continue;
  }

  break;
}

if (!response!.ok) {
  const body = await response!.text();

  console.error({
    model: GEMINI_MODEL,
    status: response!.status,
    body,
  });

  if (response!.status === 503) {
    throw new Error(
      "AI service is temporarily busy. Please try again in a few seconds."
    );
  }

  throw new Error(`Gemini responded ${response!.status}: ${body}`);
}


  const json = await response.json();

  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    return JSON.parse(cleaned);
  }
}