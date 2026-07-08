import { Type, MediaResolution, type Schema } from "@google/genai";
import { getGemini, GEMINI_VIDEO_ANALYSIS_MODEL } from "@/lib/gemini";
import { getTagTaxonomyCategories } from "./tag-taxonomy-cache";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "high" | "medium" | "low";

export interface VideoAnalysis {
  visual: {
    attackingTeamColors: string;
    defendingTeamColors: string;
    goalkeeperColors: string | null;
    identifiedTeams: string | null;
    competitionOrLeague: string | null;
    onScreenText: string | null;
    cameraAngle: string;
    onScreenCardShown: "none" | "yellow" | "red";
    onScreenRestartShown: string | null;
  };
  incident: {
    actionDescription: string;
    bodyPartsInvolved: string[];
    pitchLocation: string;
    pitchZone:
      | "own-defensive-third"
      | "middle-third"
      | "attacking-third"
      | "inside-penalty-area"
      | "on-edge-of-penalty-area"
      | "unclear";
    refereePosition: string;
    refereeProximity: "close" | "medium" | "far" | "unclear";
    varInvolved: boolean;
  };
  suggestions: {
    categorySlug: string | null;
    criteriaSlugs: string[];
    restartSlug: string | null;
    sanctionSlug: string | null;
    scenarioSlug: string | null;
    lawNumbers: number[];
  };
  confidence: {
    teams: ConfidenceLevel;
    league: ConfidenceLevel;
    category: ConfidenceLevel;
    criteria: ConfidenceLevel;
    restart: ConfidenceLevel;
    sanction: ConfidenceLevel;
  };
  visualNarrative: string;
}

export interface AnalyzeVideoInput {
  fileUrl: string;
  title: string;
  duration?: number | null;
  trimStart?: number | null;
  trimEnd?: number | null;
  /** Existing tags on the clip — authoritative context, never contradicted. */
  existingTags: Array<{ name: string; slug: string; categorySlug: string }>;
}

// ────────────────────────────────────────────────────────────────────────────
// Response schema — enums generated at runtime from the live tag taxonomy so
// Gemini physically cannot return a slug that doesn't exist in the system.
// ────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_ENUM = ["high", "medium", "low"];

interface TaxonomySlugs {
  category: string[];
  criteria: string[];
  restarts: string[];
  sanction: string[];
  scenario: string[];
}

async function getTaxonomySlugs(): Promise<TaxonomySlugs> {
  const categories = await getTagTaxonomyCategories();
  const bySlug = (slug: string) =>
    categories.find((c) => c.slug === slug)?.tags.map((t) => t.slug) ?? [];
  return {
    category: bySlug("category"),
    criteria: bySlug("criteria"),
    restarts: bySlug("restarts"),
    sanction: bySlug("sanction"),
    scenario: bySlug("scenario"),
  };
}

function buildResponseSchema(slugs: TaxonomySlugs): Schema {
  const nullableEnum = (values: string[]): Schema => ({
    type: Type.STRING,
    enum: values,
    nullable: true,
  });

  return {
    type: Type.OBJECT,
    required: ["visual", "incident", "suggestions", "confidence", "visualNarrative"],
    properties: {
      visual: {
        type: Type.OBJECT,
        required: [
          "attackingTeamColors",
          "defendingTeamColors",
          "cameraAngle",
          "onScreenCardShown",
        ],
        properties: {
          attackingTeamColors: { type: Type.STRING },
          defendingTeamColors: { type: Type.STRING },
          goalkeeperColors: { type: Type.STRING, nullable: true },
          identifiedTeams: { type: Type.STRING, nullable: true },
          competitionOrLeague: { type: Type.STRING, nullable: true },
          onScreenText: { type: Type.STRING, nullable: true },
          cameraAngle: { type: Type.STRING },
          onScreenCardShown: { type: Type.STRING, enum: ["none", "yellow", "red"] },
          onScreenRestartShown: { type: Type.STRING, nullable: true },
        },
      },
      incident: {
        type: Type.OBJECT,
        required: [
          "actionDescription",
          "bodyPartsInvolved",
          "pitchLocation",
          "pitchZone",
          "refereePosition",
          "refereeProximity",
          "varInvolved",
        ],
        properties: {
          actionDescription: { type: Type.STRING },
          bodyPartsInvolved: { type: Type.ARRAY, items: { type: Type.STRING } },
          pitchLocation: { type: Type.STRING },
          pitchZone: {
            type: Type.STRING,
            enum: [
              "own-defensive-third",
              "middle-third",
              "attacking-third",
              "inside-penalty-area",
              "on-edge-of-penalty-area",
              "unclear",
            ],
          },
          refereePosition: { type: Type.STRING },
          refereeProximity: {
            type: Type.STRING,
            enum: ["close", "medium", "far", "unclear"],
          },
          varInvolved: { type: Type.BOOLEAN },
        },
      },
      suggestions: {
        type: Type.OBJECT,
        required: ["criteriaSlugs", "lawNumbers"],
        properties: {
          categorySlug: nullableEnum(slugs.category),
          criteriaSlugs: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: slugs.criteria },
          },
          restartSlug: nullableEnum(slugs.restarts),
          sanctionSlug: nullableEnum(slugs.sanction),
          scenarioSlug: nullableEnum(slugs.scenario),
          lawNumbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        },
      },
      confidence: {
        type: Type.OBJECT,
        required: ["teams", "league", "category", "criteria", "restart", "sanction"],
        properties: {
          teams: { type: Type.STRING, enum: CONFIDENCE_ENUM },
          league: { type: Type.STRING, enum: CONFIDENCE_ENUM },
          category: { type: Type.STRING, enum: CONFIDENCE_ENUM },
          criteria: { type: Type.STRING, enum: CONFIDENCE_ENUM },
          restart: { type: Type.STRING, enum: CONFIDENCE_ENUM },
          sanction: { type: Type.STRING, enum: CONFIDENCE_ENUM },
        },
      },
      visualNarrative: { type: Type.STRING },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Prompts
// ────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional football (soccer) match analyst working for a referee training platform. You watch a short match clip and extract ONLY what is visually observable, plus carefully-scoped tag suggestions.

=== THE GOLDEN PRINCIPLE: EXHAUSTIVE TEXT, STRICT FIELDS ===
Your output has two different standards of evidence:
• The visualNarrative (free text) must be EXHAUSTIVE — capture every visible detail a referee might later search for. If you can see it, describe it. Richness here directly improves search quality.
• The structured fields (teams, league, suggestions, enums) must be STRICT — they drive automatic tagging, so fill them ONLY when clearly determined. Null or "unclear" is ALWAYS better than a guess. Never force a value.
The same detail can appear in the narrative as an observation ("the challenge appears to catch the attacker above the ankle with studs") while its structured counterpart stays null because it is not conclusive.

=== ABSOLUTE RULES ===
1. FACTS ONLY. Report what the camera shows. Never invent teams, players, competitions, scores, or decisions that are not visible.
2. When something is not visible or you are not confident, return null (or "unclear" for enum fields) in structured fields. A null is ALWAYS better than a guess.
3. The clip's EXISTING TAGS (provided in the user message) are authoritative ground truth set by a referee expert. Never contradict them in your narrative. Your suggestions are only used to fill fields the expert left empty.
4. Use precise IFAB/UEFA terminology for actions: "challenge", "tackle from behind", "studs showing", "point of contact", "deliberate handball", "offside position", etc.
5. You are NOT the referee. Describe the physical action; do not rule on whether it was careless/reckless/serious foul play unless the evidence is overwhelming — and even then mark criteria confidence "low" or "medium".

=== CRITICAL: ON-FIELD DECISION ≠ CORRECT DECISION ===
These are referee TRAINING clips. Many were chosen precisely BECAUSE the referee on the pitch made a MISTAKE. Therefore:
• What the referee does in the clip (card shown, restart given, play waved on) is the ON-FIELD DECISION — a historical fact about the video, NOT the correct answer.
• The EXISTING TAGS encode the OFFICIALLY CORRECT decision per expert/UEFA assessment. When the on-field decision differs from the tags, the TAGS are right and the referee in the video was wrong.
• NEVER describe the on-field decision as "the correct decision", "rightly", "correctly awarded", or similar. Describe it neutrally: "the referee showed a yellow card", "the referee awarded a penalty kick".
• If you observe an on-field decision that CONFLICTS with the existing tags (e.g. clip shows a yellow card but the sanction tag says red-card), explicitly note in the visualNarrative that the on-field decision differs from the assessed correct decision — this is valuable training content, describe both sides factually.
• onScreenCardShown / onScreenRestartShown report what is VISIBLE in the clip only. Report them faithfully even when they conflict with the tags — the system handles the distinction downstream.
• Your suggestions.sanctionSlug / suggestions.restartSlug must reflect what the CORRECT decision would be, and since you cannot judge that reliably, only fill them when the existing tags or overwhelming visual evidence make it certain. When the on-field decision might be a mistake, leave them null.

=== PITCH LOCATION — HIGH STAKES, BE CONSERVATIVE ===
Whether contact happens INSIDE or OUTSIDE the penalty area changes the correct restart (penalty kick vs direct free kick). This is one of the most consequential facts you report:
• Only say "inside the penalty area" or "outside the penalty area" when the ball/contact position relative to the line is CLEARLY visible (you can see the line and the point of contact in the same frame, ideally in a replay).
• Camera perspective (especially low or angled views) distorts positions near the boundary. If the contact is anywhere near the line and you are not certain, use pitchZone "on-edge-of-penalty-area" or "unclear" and write "near the edge of the penalty area (exact side of the line not clearly determinable from the footage)" in the narrative.
• CALIBRATE WITH TAGS: if the existing tags include a restart, it tells you the true location context — "direct-free-kick" implies the offence was outside the penalty area; "penalty-kick" implies inside. Never state a location that contradicts the tagged restart.
• The same conservatism applies to offside lines: only assert a player was beyond the second-last defender if a replay/line graphic makes it clear.

=== TEAMS AND COMPETITION IDENTIFICATION ===
- Report kit colours exactly as seen (shirt, shorts, socks if distinguishable).
- Only fill identifiedTeams / competitionOrLeague when there is on-screen evidence: broadcast scoreboard, club crest, competition logo, or unmistakable iconic kits. You may use Google Search to confirm a suspected match (e.g. scoreline + kit colours + stadium). If you cannot confirm, return null and set the confidence field accordingly.
- Transcribe any visible scoreboard/broadcast text into onScreenText (teams abbreviations, score, match clock).

=== SANCTION / RESTART SUGGESTIONS — STRICT GATE ===
- suggestions.sanctionSlug / suggestions.restartSlug describe the CORRECT decision, not the on-field one. Because the referee in the clip may have erred, an on-screen card/restart alone is NOT sufficient evidence.
- Only fill them when the correct decision is beyond doubt (e.g. the existing tags already imply it, or an official broadcast graphic/VAR overturn confirms it). Otherwise leave null — these suggestions are never auto-applied anyway; they are shown to the admin for review.
- Never infer sanction from the type of offence. DOGSO can be yellow or red. Serious-looking fouls sometimes get no card in the clip.

=== CATEGORY SUGGESTION ===
- Choose the incident category from what physically happens: a tackle → challenges; ball striking arm → handball; shirt grab → holding; player in offside position flagged → offside; etc.
- Confidence "high" only when the action type is unambiguous on screen.

=== visualNarrative — BE EXHAUSTIVE ===
Dense English prose (200-400 words) that a referee instructor could read instead of watching the clip. This text powers semantic search, so include EVERY visible detail a user might search for:
• Match context: competition/broadcast graphics, stadium cues, scoreboard, score, match clock, weather, crowd, day/night.
• Both teams: full kit description (shirts, shorts, socks), goalkeeper kits, visible jersey numbers, captain armbands.
• Phase of play: open play, counter-attack, set piece, corner, free kick, buildup, transition; direction and speed of the attack.
• The players involved: their roles (defender, winger, striker, goalkeeper), their movements before/during/after the incident.
• The incident itself: exact pitch location, distances, how contact happens, body parts, force, ball position, who wins the ball.
• Officials: referee position, distance, angle of view, whether their view was screened, running or stationary, signals given; assistant referee flag if visible; fourth official or VAR review if shown.
• The aftermath: card shown, restart taken, player reactions, injuries, protests, substitutions, goal scored/disallowed.
• Alternate phrasings: weave in the different ways referees might describe the same action (e.g. "lunging tackle" / "sliding challenge from behind" / "late challenge") so varied search queries can match.
Facts only — describe richly what IS visible, stay silent about what is not. No legal judgment, no invented details.`;

function buildUserPrompt(input: AnalyzeVideoInput): string {
  const tagLines =
    input.existingTags.length > 0
      ? input.existingTags
          .map((t) => `- [${t.categorySlug}] ${t.name} (slug: ${t.slug})`)
          .join("\n")
      : "(none assigned yet)";

  return `Analyze this referee training clip.

CLIP TITLE: ${input.title}

EXISTING TAGS ON THIS CLIP (authoritative — these encode the OFFICIALLY CORRECT decision per expert/UEFA assessment, which may DIFFER from what the referee in the clip actually did; never contradict them, and calibrate your location claims against the tagged restart):
${tagLines}

Fill the JSON schema. Remember the golden principle: the visualNarrative must be exhaustive (every visible, searchable detail — 200-400 words), while structured fields stay strict — null over guessing. The on-field decision in the clip is a fact about the video, never "the correct decision".`;
}

// ────────────────────────────────────────────────────────────────────────────
// File upload helpers (Gemini Files API)
// ────────────────────────────────────────────────────────────────────────────

function guessMimeType(fileUrl: string): string {
  const path = fileUrl.split("?")[0].toLowerCase();
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".avi")) return "video/x-msvideo";
  if (path.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

async function uploadVideoToGemini(fileUrl: string): Promise<{ uri: string; mimeType: string; name: string }> {
  const ai = getGemini();

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to download video from storage (${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  const mimeType = guessMimeType(fileUrl);
  const blob = new Blob([buffer], { type: mimeType });

  let file = await ai.files.upload({
    file: blob,
    config: { mimeType, displayName: "referee-clip-analysis" },
  });

  // Poll until the file is processed and ready for inference (max ~2 min).
  const deadline = Date.now() + 120_000;
  while (file.state === "PROCESSING" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    file = await ai.files.get({ name: file.name! });
  }

  if (file.state !== "ACTIVE") {
    throw new Error(`Gemini file processing did not complete (state: ${file.state})`);
  }

  return { uri: file.uri!, mimeType: file.mimeType || mimeType, name: file.name! };
}

// ────────────────────────────────────────────────────────────────────────────
// Validation — belt-and-braces on top of the schema enums
// ────────────────────────────────────────────────────────────────────────────

function validateSuggestions(
  analysis: VideoAnalysis,
  slugs: TaxonomySlugs
): VideoAnalysis {
  const s = analysis.suggestions;
  const inSet = (list: string[], v: string | null | undefined) =>
    typeof v === "string" && list.includes(v) ? v : null;

  return {
    ...analysis,
    suggestions: {
      categorySlug: inSet(slugs.category, s?.categorySlug),
      criteriaSlugs: Array.isArray(s?.criteriaSlugs)
        ? s.criteriaSlugs.filter((c) => slugs.criteria.includes(c))
        : [],
      restartSlug: inSet(slugs.restarts, s?.restartSlug),
      sanctionSlug: inSet(slugs.sanction, s?.sanctionSlug),
      scenarioSlug: inSet(slugs.scenario, s?.scenarioSlug),
      lawNumbers: Array.isArray(s?.lawNumbers)
        ? s.lawNumbers.filter((n) => Number.isInteger(n) && n >= 1 && n <= 17)
        : [],
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────────────────────

export async function analyzeVideoClip(input: AnalyzeVideoInput): Promise<VideoAnalysis> {
  const ai = getGemini();
  const slugs = await getTaxonomySlugs();
  const responseSchema = buildResponseSchema(slugs);

  const uploaded = await uploadVideoToGemini(input.fileUrl);

  // If the stored clip still carries un-baked trim points, only analyze that segment.
  const trimStart = input.trimStart ?? 0;
  const trimEnd = input.trimEnd ?? null;
  const duration = input.duration ?? null;
  const hasTrim =
    trimStart > 0.5 || (trimEnd !== null && duration !== null && trimEnd < duration - 0.5);

  const videoPart: Record<string, unknown> = {
    fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType },
  };
  if (hasTrim) {
    videoPart.videoMetadata = {
      startOffset: `${Math.max(0, Math.floor(trimStart))}s`,
      ...(trimEnd !== null ? { endOffset: `${Math.ceil(trimEnd)}s` } : {}),
    };
  }

  const contents = [{ role: "user", parts: [videoPart, { text: buildUserPrompt(input) }] }];

  const baseConfig = {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseSchema,
    // High resolution so on-screen scoreboards / broadcast text are readable.
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
  };

  let responseText: string | undefined;
  try {
    // Preferred: structured output + Google Search grounding (Gemini 3 supports both together)
    // so team/league identification can be confirmed instead of guessed.
    const response = await ai.models.generateContent({
      model: GEMINI_VIDEO_ANALYSIS_MODEL,
      contents,
      config: { ...baseConfig, tools: [{ googleSearch: {} }] },
    });
    responseText = response.text;
  } catch (error) {
    console.warn(
      "Gemini analysis with search grounding failed, retrying without tools:",
      error
    );
    const response = await ai.models.generateContent({
      model: GEMINI_VIDEO_ANALYSIS_MODEL,
      contents,
      config: baseConfig,
    });
    responseText = response.text;
  } finally {
    // Uploaded files auto-expire after 48h; delete eagerly anyway.
    ai.files.delete({ name: uploaded.name }).catch(() => {});
  }

  if (!responseText) {
    throw new Error("Gemini returned an empty response for video analysis");
  }

  let parsed: VideoAnalysis;
  try {
    parsed = JSON.parse(responseText) as VideoAnalysis;
  } catch {
    throw new Error("Gemini returned invalid JSON for video analysis");
  }

  return validateSuggestions(parsed, slugs);
}

/**
 * Renders the structured analysis as a plain-text facts block that gets merged
 * into the raw admin description feeding the search-description generator.
 */
export function analysisToFactsText(a: VideoAnalysis): string {
  const lines: string[] = ["=== AI VIDEO ANALYSIS (visually observed facts) ==="];

  lines.push(a.visualNarrative.trim());
  lines.push("");
  lines.push(`Attacking team colours: ${a.visual.attackingTeamColors}`);
  lines.push(`Defending team colours: ${a.visual.defendingTeamColors}`);
  if (a.visual.goalkeeperColors) lines.push(`Goalkeeper colours: ${a.visual.goalkeeperColors}`);
  if (a.visual.identifiedTeams)
    lines.push(`Teams (confidence: ${a.confidence.teams}): ${a.visual.identifiedTeams}`);
  if (a.visual.competitionOrLeague)
    lines.push(
      `Competition/league (confidence: ${a.confidence.league}): ${a.visual.competitionOrLeague}`
    );
  if (a.visual.onScreenText) lines.push(`On-screen text: ${a.visual.onScreenText}`);
  lines.push(`Camera angle: ${a.visual.cameraAngle}`);
  if (a.visual.onScreenCardShown !== "none")
    lines.push(
      `On-field decision shown in clip: referee showed a ${a.visual.onScreenCardShown} card ` +
        `(this is what the referee did in the video — NOT necessarily the correct decision; the tags encode the correct decision)`
    );
  if (a.visual.onScreenRestartShown)
    lines.push(
      `On-field restart shown in clip: ${a.visual.onScreenRestartShown} ` +
        `(what the referee gave in the video — NOT necessarily the correct restart; the tags encode the correct decision)`
    );
  lines.push(`Action: ${a.incident.actionDescription}`);
  if (a.incident.bodyPartsInvolved.length > 0)
    lines.push(`Body parts involved: ${a.incident.bodyPartsInvolved.join(", ")}`);
  lines.push(`Pitch location: ${a.incident.pitchLocation} (${a.incident.pitchZone})`);
  lines.push(
    `Referee position: ${a.incident.refereePosition} (proximity: ${a.incident.refereeProximity})`
  );
  if (a.incident.varInvolved) lines.push("VAR involved: yes");

  return lines.join("\n");
}
