import { getOpenAI } from "@/lib/openai";
import { loadPrompt } from "./prompt-loader";

export interface InferredTag {
  tagSlug: string;
  categorySlug: string;
  confidence: "high" | "medium";
}

export interface EnhancedQuery {
  cleanedQuery: string;
  expandedQuery: string;
  detectedLanguage: "en" | "he" | "mixed";
  keywords: string[];
  inferredTags: InferredTag[];
}

export async function enhanceSearchQuery(
  rawQuery: string
): Promise<EnhancedQuery> {
  const prompt = await loadPrompt("user_query_enhancement");

  const response = await getOpenAI().chat.completions.create({
    model: prompt.model,
    temperature: prompt.temperature,
    max_tokens: prompt.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: rawQuery },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI model for query enhancement");
  }

  const parsed = JSON.parse(content);

  return {
    cleanedQuery: parsed.cleanedQuery || rawQuery,
    expandedQuery: parsed.expandedQuery || rawQuery,
    detectedLanguage: (["en", "he", "mixed"].includes(parsed.detectedLanguage) ? parsed.detectedLanguage : "en") as "en" | "he" | "mixed",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    inferredTags: Array.isArray(parsed.inferredTags)
      ? parsed.inferredTags
          .filter(
            (t: any) =>
              t &&
              typeof t.tagSlug === "string" &&
              typeof t.categorySlug === "string" &&
              (t.confidence === "high" || t.confidence === "medium")
          )
          .map((t: any) => ({
            tagSlug: t.tagSlug,
            categorySlug: t.categorySlug,
            confidence: t.confidence as "high" | "medium",
          }))
      : [],
  };
}
