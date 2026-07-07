/**
 * Referee portrait generation configuration.
 *
 * Single source of truth shared by:
 *  - scripts/generate-referee-hologram.mjs  (CLI generation)
 *  - app/api/admin/generate-hologram/route.ts  (web UI generation)
 */

// ── Step 1: Hologram still image ────────────────────────────────────────────

export const HOLOGRAM_MODEL = "black-forest-labs/flux-kontext-pro" as const;
// Upgrade to "black-forest-labs/flux-kontext-max" for higher quality (requires paid credits).

export const HOLOGRAM_PROMPT =
  "Relight and restyle this portrait as a premium cinematic holographic projection: " +
  "preserve the person's face, expression and identity completely. " +
  "Shift the colour palette to vivid cyan and electric blue tones, " +
  "add a subtle luminous neon edge outline tracing the silhouette, " +
  "deepen the background to near-black with faint blue atmospheric depth, " +
  "apply a soft translucent glow across the body. " +
  "The result should feel like a high-end sci-fi movie hologram — " +
  "photorealistic face, beautifully lit, not cartoonish or ghost-like. " +
  "Cinematic quality, ultra-sharp, detailed.";

export const HOLOGRAM_IMAGE_OPTIONS = {
  aspect_ratio: "match_input_image" as const,
  output_format: "jpg" as const,
  safety_tolerance: 2,
  output_quality: 95,
};

// ── Step 2: Animated video clip ─────────────────────────────────────────────

/**
 * MiniMax Video-01 — image-to-video model.
 * Takes `first_frame_image` + a text prompt and generates a 6s clip.
 * Costs ~$0.05–0.15 per generation.
 */
export const VIDEO_MODEL = "minimax/video-01" as const;

/**
 * Motion prompt: describes what the person does in the 6-second clip.
 * The model uses the first frame (referee photo) as the starting pose.
 */
export const VIDEO_PROMPT =
  "Shoulders-and-up portrait. The man starts at a slight three-quarter angle, " +
  "then slowly and smoothly turns to face the camera directly, " +
  "holds a composed, confident look straight into the lens, and stays still. " +
  "Clean dark background. Broadcast quality, like a professional football team-sheet presentation on TV. " +
  "No text, no graphics, no distractions — just the face and shoulders, sharp and cinematic.";

export const VIDEO_OPTIONS = {
  prompt_optimizer: false,
};
