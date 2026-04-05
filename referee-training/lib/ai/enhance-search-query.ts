import { getOpenAI } from "@/lib/openai";
import { loadPrompt } from "./prompt-loader";
import { getTagTaxonomyCategories } from "./tag-taxonomy-cache";

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

async function validateTagsAgainstTaxonomy(
  tags: InferredTag[]
): Promise<InferredTag[]> {
  if (tags.length === 0) return tags;

  const categories = await getTagTaxonomyCategories();
  const validSlugs = new Set<string>();
  const categorySlugSet = new Set<string>();

  for (const cat of categories) {
    categorySlugSet.add(cat.slug);
    for (const tag of cat.tags) {
      validSlugs.add(`${cat.slug}:${tag.slug}`);
    }
  }

  return tags.filter((t) => {
    const key = `${t.categorySlug}:${t.tagSlug}`;
    const isValid = validSlugs.has(key);
    if (!isValid) {
      console.warn(
        `AI returned non-existent tag "${t.tagSlug}" in category "${t.categorySlug}" — filtering out`
      );
    }
    return isValid;
  });
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

  const rawTags: InferredTag[] = Array.isArray(parsed.inferredTags)
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
    : [];

  const validatedTags = await validateTagsAgainstTaxonomy(rawTags);

  return {
    cleanedQuery: parsed.cleanedQuery || rawQuery,
    expandedQuery: parsed.expandedQuery || rawQuery,
    detectedLanguage: (["en", "he", "mixed"].includes(parsed.detectedLanguage) ? parsed.detectedLanguage : "en") as "en" | "he" | "mixed",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    inferredTags: validatedTags,
  };
}
