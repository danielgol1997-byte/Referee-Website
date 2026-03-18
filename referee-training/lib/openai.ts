import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required. Add it to your .env file."
    );
  }

  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return _client;
}
