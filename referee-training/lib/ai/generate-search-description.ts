import { getOpenAI } from "@/lib/openai";
import { loadPrompt } from "./prompt-loader";
import { getTagTaxonomyCategories } from "./tag-taxonomy-cache";

interface VideoMetadata {
  title: string;
  description?: string | null;
  decisionExplanation?: string | null;
  isEducational?: boolean;
  restartType?: string | null;
  sanctionType?: string | null;
  offsideReason?: string | null;
  playOn?: boolean;
  noOffence?: boolean;
  varRelevant?: boolean;
  lawNumbers?: number[];
  tags: Array<{
    name: string;
    slug: string;
    categoryName: string;
    categorySlug: string;
    isCorrectDecision: boolean;
  }>;
}

export interface SearchDescriptionResult {
  canonicalDescription: string;
  searchSummary: string;
  searchKeywords: string[];
  embeddingText: string;
  suggestedTags: string[]; // tag slugs the AI is 100% confident about
}

function replaceConditional(template: string, tag: string, value: boolean | string | null | undefined): string {
  const open = `{{#if ${tag}}}`;
  const close = "{{/if}}";
  let result = template;
  let startIdx = result.indexOf(open);
  while (startIdx !== -1) {
    const endIdx = result.indexOf(close, startIdx);
    if (endIdx === -1) break;
    const inner = result.substring(startIdx + open.length, endIdx);
    result = result.substring(0, startIdx) + (value ? inner : "") + result.substring(endIdx + close.length);
    startIdx = result.indexOf(open);
  }
  return result;
}

function buildUserMessage(
  template: string | null,
  metadata: VideoMetadata,
  rawDescription: string
): string {
  if (template) {
    let msg = template;
    msg = msg.replace("{{title}}", metadata.title);
    msg = replaceConditional(msg, "description", metadata.description);
    msg = msg.replace("{{description}}", metadata.description || "");
    msg = replaceConditional(msg, "decisionExplanation", metadata.decisionExplanation);
    msg = msg.replace("{{decisionExplanation}}", metadata.decisionExplanation || "");
    msg = replaceConditional(msg, "isEducational", metadata.isEducational);
    msg = replaceConditional(msg, "restartType", metadata.restartType);
    msg = msg.replace("{{restartType}}", metadata.restartType || "");
    msg = replaceConditional(msg, "sanctionType", metadata.sanctionType);
    msg = msg.replace("{{sanctionType}}", metadata.sanctionType || "");
    msg = replaceConditional(msg, "offsideReason", metadata.offsideReason);
    msg = msg.replace("{{offsideReason}}", metadata.offsideReason || "");
    msg = replaceConditional(msg, "playOn", metadata.playOn);
    msg = replaceConditional(msg, "noOffence", metadata.noOffence);
    msg = replaceConditional(msg, "varRelevant", metadata.varRelevant);
    msg = replaceConditional(msg, "lawNumbers", metadata.lawNumbers?.length ? "yes" : null);
    msg = msg.replace("{{lawNumbers}}", (metadata.lawNumbers || []).join(", "));

    const tagLines = metadata.tags
      .map((t) => `- [${t.categorySlug}] ${t.name} (slug: ${t.slug})${t.isCorrectDecision ? " ← correct decision" : ""}`)
      .join("\n");
    msg = msg.replace("{{tags}}", tagLines || "(no tags assigned)");
    msg = msg.replace("{{rawDescription}}", rawDescription || "(no description provided)");

    return msg.replace(/\n{3,}/g, "\n\n").trim();
  }

  const parts: string[] = [`VIDEO: ${metadata.title}`];
  if (metadata.isEducational) parts.push("Type: Explanation clip");
  if (metadata.description) parts.push(`Description: ${metadata.description}`);
  if (metadata.decisionExplanation) parts.push(`Explanation/Guidance: ${metadata.decisionExplanation}`);
  if (metadata.restartType) parts.push(`Restart: ${metadata.restartType}`);
  if (metadata.sanctionType) parts.push(`Sanction: ${metadata.sanctionType}`);
  if (metadata.offsideReason) parts.push(`Offside Reason: ${metadata.offsideReason}`);
  if (metadata.playOn) parts.push("Decision: Play On");
  if (metadata.noOffence) parts.push("Decision: No Offence");
  if (metadata.lawNumbers?.length) parts.push(`Laws: ${metadata.lawNumbers.join(", ")}`);

  parts.push("\nEXISTING TAGS (use these as context — they are authoritative):");
  for (const t of metadata.tags) {
    parts.push(`- [${t.categorySlug}] ${t.name} (slug: ${t.slug})${t.isCorrectDecision ? " ← correct decision" : ""}`);
  }

  parts.push(`\nADMIN DESCRIPTION:\n${rawDescription || "(none provided)"}`);
  return parts.join("\n");
}

export async function generateSearchDescription(
  metadata: VideoMetadata,
  rawDescription: string
): Promise<SearchDescriptionResult> {
  const prompt = await loadPrompt("search_description_generation");
  const userMessage = buildUserMessage(prompt.userPromptTemplate, metadata, rawDescription);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: prompt.systemPrompt },
    { role: "user", content: userMessage },
  ];

  let response = await getOpenAI().chat.completions.create({
    model: prompt.model,
    temperature: prompt.temperature,
    max_tokens: prompt.maxTokens,
    response_format: { type: "json_object" },
    messages,
  });

  let content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI model");
  }

  let parsed = JSON.parse(content);
  const wordCount = (parsed.canonicalDescription || "").split(/\s+/).length;

  // Preserve suggestedTags from first response in case retry doesn't include them
  const firstPassSuggestedTags = Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [];

  // If the description is under 150 words and the admin gave a non-trivial input, ask the model to expand
  if (wordCount < 150 && rawDescription.split(/\s+/).length > 20) {
    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: `Your canonicalDescription is only ${wordCount} words. This is too short. The admin provided a detailed description and you compressed it into a brief summary. Please rewrite the ENTIRE JSON response with a canonicalDescription of at least 250 words. Include every detail from the admin's description. Also expand the embeddingText to match. Do not shorten any other field. IMPORTANT: You MUST include the suggestedTags field with exact tag slugs from the taxonomy.`,
    });

    response = await getOpenAI().chat.completions.create({
      model: prompt.model,
      temperature: prompt.temperature,
      max_tokens: prompt.maxTokens,
      response_format: { type: "json_object" },
      messages,
    });

    const expandedContent = response.choices[0]?.message?.content;
    if (expandedContent) {
      const expandedParsed = JSON.parse(expandedContent);
      const expandedWordCount = (expandedParsed.canonicalDescription || "").split(/\s+/).length;
      if (expandedWordCount > wordCount) {
        parsed = expandedParsed;
      }
    }
  }

  // Use suggestedTags from whichever pass actually returned them
  const rawSuggestedTags = Array.isArray(parsed.suggestedTags) && parsed.suggestedTags.length > 0
    ? parsed.suggestedTags
    : firstPassSuggestedTags;
  const filteredTags = Array.isArray(rawSuggestedTags)
    ? rawSuggestedTags
        .filter((t: unknown) => typeof t === "string")
        .map((t: string) => {
          // AI sometimes returns "categorySlug/tagSlug"; normalise to bare tag slug
          const slashIdx = t.lastIndexOf("/");
          return slashIdx !== -1 ? t.slice(slashIdx + 1) : t;
        })
    : [];

  // Validate suggested tags against the real taxonomy to prevent hallucinated slugs
  const validatedTags = await validateSuggestedTags(
    filteredTags,
    metadata.tags.map((t) => t.slug)
  );

  return {
    canonicalDescription: parsed.canonicalDescription || "",
    searchSummary: parsed.searchSummary || "",
    searchKeywords: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : [],
    embeddingText: parsed.embeddingText || parsed.canonicalDescription || "",
    suggestedTags: validatedTags,
  };
}

async function validateSuggestedTags(
  slugs: string[],
  existingTagSlugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return slugs;

  const categories = await getTagTaxonomyCategories();
  const allValidSlugs = new Set<string>();
  for (const cat of categories) {
    for (const tag of cat.tags) {
      allValidSlugs.add(tag.slug);
    }
  }

  const existingSet = new Set(existingTagSlugs);

  return slugs.filter((slug) => {
    if (!allValidSlugs.has(slug)) {
      console.warn(
        `[AI suggested tags] Non-existent tag slug "${slug}" — filtering out`
      );
      return false;
    }
    if (existingSet.has(slug)) {
      return false;
    }
    return true;
  });
}
