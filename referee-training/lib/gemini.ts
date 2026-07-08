import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (_client) return _client;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is required. Add it to your .env file (get one at https://aistudio.google.com/apikey)."
    );
  }

  _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
}

/** Strongest video-understanding model with structured output + search grounding. */
export const GEMINI_VIDEO_ANALYSIS_MODEL = "gemini-3.1-pro-preview";

/** Fast, cheap text model for query enhancement, description generation, reranking. */
export const GEMINI_FAST_TEXT_MODEL = "gemini-3-flash-preview";

/** Embedding model — pinned; all stored vectors and query vectors MUST use it. */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Extract the first balanced top-level JSON object from a string. Gemini
 * occasionally appends stray text after the JSON even with
 * responseMimeType=application/json.
 */
function parseFirstJsonObject(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to balanced-brace extraction.
  }
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in Gemini response");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON object in Gemini response");
}

/**
 * Shared helper: run a Gemini text prompt that must return strict JSON.
 * Throws when the model returns no or invalid JSON.
 */
/** Stable GA model used when the preview model is overloaded (503s). */
const GEMINI_STABLE_FALLBACK_MODEL = "gemini-2.5-flash";

function isTransientGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /503|UNAVAILABLE|overloaded|high demand|429|RESOURCE_EXHAUSTED/i.test(msg);
}

async function geminiGenerateJsonOnce(
  model: string,
  options: {
    systemInstruction: string;
    messages: Array<{ role: "user" | "model"; text: string }>;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<{ parsed: any; rawText: string }> {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model,
    contents: options.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    config: {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      responseMimeType: "application/json",
      // Extraction/rewriting tasks, not hard reasoning — keep latency low.
      // thinkingLevel only exists on Gemini 3+ models.
      ...(model.startsWith("gemini-3")
        ? { thinkingConfig: { thinkingLevel: "LOW" as any } }
        : {}),
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }
  return { parsed: parseFirstJsonObject(rawText), rawText };
}

/**
 * The preview models intermittently return 503 "high demand", so the primary
 * and the stable GA model are raced in parallel — the first success wins.
 * One retry round follows if both fail with a transient error.
 */
export async function geminiGenerateJson(options: {
  systemInstruction: string;
  messages: Array<{ role: "user" | "model"; text: string }>;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}): Promise<{ parsed: any; rawText: string }> {
  const primary = options.model || GEMINI_FAST_TEXT_MODEL;
  const models = [...new Set([primary, GEMINI_STABLE_FALLBACK_MODEL])];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await Promise.any(
        models.map((m) => geminiGenerateJsonOnce(m, options))
      );
    } catch (aggregate: any) {
      const errors: unknown[] = aggregate?.errors ?? [aggregate];
      lastError = errors[0];
      // Non-transient failures (bad request, auth) won't fix themselves.
      if (!errors.some(isTransientGeminiError)) throw lastError;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastError;
}
