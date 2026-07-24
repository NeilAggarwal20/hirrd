const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";

// One initial attempt + up to 3 retries. Delays use exponential backoff
// with full jitter (random between 0 and the exponential cap) so that
// concurrent requests retrying at the same time don't all hammer Gemini
// again in lockstep.
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 6000;

// Statuses worth retrying: rate limiting and server-side/transient
// failures. Anything else (400 bad request, 401/403 auth, etc.) won't
// be fixed by retrying, so those fail fast instead.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

interface GeminiApiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function backoffDelayMs(attempt: number): number {
  const cap = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.round(Math.random() * cap);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiJson(json: unknown): unknown {
  const text = (json as GeminiApiResponse)?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("[gemini] response had no text content:", JSON.stringify(json).slice(0, 500));
    throw new Error("AI service returned an unexpected response. Please try again.");
  }

  try {
    const cleaned = text
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      console.error("[gemini] response was not valid JSON:", text.slice(0, 500));
      throw new Error("AI service returned an unexpected response. Please try again.");
    }
  } catch (e) {
    throw e;
  }
}

/**
 * Calls Gemini and parses its response as JSON, automatically retrying
 * transient failures — 429/500/502/503/504 responses, and network-level
 * errors like timeouts or connection resets — with exponential backoff
 * and jitter before giving up.
 *
 * Only once every attempt is exhausted does this throw, and it always
 * throws a short, generic, user-safe message. The actual status code and
 * response body are logged (console.error/warn) for debugging but never
 * included in what's thrown — callers read `.message` straight into an
 * HTTP response body, so anything thrown here is what the end user sees.
 */
export async function callGeminiForJson(prompt: string): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    console.error("[gemini] GEMINI_API_KEY is not configured");
    throw new Error("AI service is not configured. Please contact support.");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;

    try {
      response = await fetch(
        `[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
        }
      );
    } catch (networkError) {
      // fetch() itself threw: DNS failure, connection reset, timeout, etc.
      const detail = networkError instanceof Error ? networkError.message : String(networkError);
      console.error(`[gemini] attempt ${attempt}/${MAX_ATTEMPTS} — network error:`, detail);

      if (attempt < MAX_ATTEMPTS) {
        const delay = backoffDelayMs(attempt);
        console.warn(`[gemini] retrying in ${delay}ms after network error...`);
        await sleep(delay);
        continue;
      }
      throw new Error("AI service is temporarily busy. Please try again in a moment.", { cause: networkError });
    }

    if (response.ok) {
      return parseGeminiJson(await response.json());
    }

    const bodyText = await response.text().catch(() => "");
    console.error(
      `[gemini] attempt ${attempt}/${MAX_ATTEMPTS} — model=${GEMINI_MODEL} status=${response.status}:`,
      bodyText.slice(0, 500)
    );

    const isRetryable = RETRYABLE_STATUSES.has(response.status);

    if (isRetryable && attempt < MAX_ATTEMPTS) {
      const delay = backoffDelayMs(attempt);
      console.warn(`[gemini] retrying in ${delay}ms (status ${response.status})...`);
      await sleep(delay);
      continue;
    }

    if (isRetryable) {
      console.error(`[gemini] exhausted all ${MAX_ATTEMPTS} attempts (last status ${response.status})`);
      throw new Error("AI service is temporarily busy. Please try again in a moment.");
    }

    // Non-retryable status — fail fast rather than burn through retries
    // on something retrying can't fix.
    throw new Error("Couldn't process that request right now. Please try again.");
  }

  // Unreachable (the loop above always returns or throws), but keeps
  // this a total function for TypeScript and any future refactor.
  throw new Error("AI service is temporarily busy. Please try again in a moment.");
}