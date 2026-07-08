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
