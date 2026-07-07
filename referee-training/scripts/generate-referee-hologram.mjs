/**
 * Referee portrait pipeline:
 *   1. Upload the referee's real photo to Cloudinary
 *   2. Generate a hologram still image via FLUX Kontext Pro → upload to Cloudinary
 *   3. Generate a 6s animated video clip via MiniMax Video-01 → upload to Cloudinary
 *
 * Usage:
 *   node scripts/generate-referee-hologram.mjs /path/to/photo.webp referee-id
 *
 * Outputs all three Cloudinary URLs — paste them into lib/stats-mock.ts REFEREE_IMAGES.
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Load .env ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(path.join(__dirname, "../.env"), "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!(key in process.env)) process.env[key] = val;
}

// ── Config (mirrors lib/hologram-config.ts) ──────────────────────────────────
const HOLOGRAM_MODEL = "black-forest-labs/flux-kontext-pro";
const HOLOGRAM_PROMPT =
  "Relight and restyle this portrait as a premium cinematic holographic projection: " +
  "preserve the person's face, expression and identity completely. " +
  "Shift the colour palette to vivid cyan and electric blue tones, " +
  "add a subtle luminous neon edge outline tracing the silhouette, " +
  "deepen the background to near-black with faint blue atmospheric depth, " +
  "apply a soft translucent glow across the body. " +
  "The result should feel like a high-end sci-fi movie hologram — " +
  "photorealistic face, beautifully lit, not cartoonish or ghost-like. " +
  "Cinematic quality, ultra-sharp, detailed.";

const VIDEO_MODEL = "minimax/video-01";
const VIDEO_PROMPT =
  "Shoulders-and-up portrait. The man starts at a slight three-quarter angle, " +
  "then slowly and smoothly turns to face the camera directly, " +
  "holds a composed, confident look straight into the lens, and stays still. " +
  "Clean dark background. Broadcast quality, like a professional football team-sheet presentation on TV. " +
  "No text, no graphics, no distractions — just the face and shoulders, sharp and cinematic.";

// ── Cloudinary helper ────────────────────────────────────────────────────────
async function uploadToCloudinary(source, folder) {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log(`  Uploading to Cloudinary: ${folder}...`);
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: "auto",
  });
  console.log(`  ✓ ${result.secure_url}`);
  return result;
}

// ── Replicate helper ─────────────────────────────────────────────────────────
async function runReplicate(model, input) {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const output = await replicate.run(model, { input });
  return output;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const [imagePath, refereeId] = process.argv.slice(2);
  if (!imagePath || !refereeId) {
    console.error("Usage: node scripts/generate-referee-hologram.mjs <image-path> <referee-id>");
    process.exit(1);
  }

  console.log(`\n🔵 Step 1 — Upload original photo`);
  const photoUpload = await uploadToCloudinary(
    imagePath,
    `referee-photos/${refereeId}`
  );

  console.log(`\n🔵 Step 2 — Generate hologram still image (FLUX Kontext Pro)`);
  const hologramOutput = await runReplicate(HOLOGRAM_MODEL, {
    prompt: HOLOGRAM_PROMPT,
    input_image: photoUpload.secure_url,
    aspect_ratio: "match_input_image",
    output_format: "jpg",
    output_quality: 95,
    safety_tolerance: 2,
  });
  const hologramUrl = typeof hologramOutput === "string"
    ? hologramOutput
    : Array.isArray(hologramOutput) ? hologramOutput[0] : String(hologramOutput);
  console.log(`  ✓ Hologram generated: ${hologramUrl}`);
  const hologramUpload = await uploadToCloudinary(
    hologramUrl,
    `referee-holograms/${refereeId}`
  );

  console.log(`\n🔵 Step 3 — Generate animated video clip (MiniMax Video-01)`);
  console.log(`  (This takes 2-3 minutes — please wait...)`);
  const videoOutput = await runReplicate(VIDEO_MODEL, {
    prompt: VIDEO_PROMPT,
    first_frame_image: photoUpload.secure_url,
    prompt_optimizer: false,
  });
  const videoUrl = typeof videoOutput === "string"
    ? videoOutput
    : Array.isArray(videoOutput) ? videoOutput[0] : String(videoOutput);
  console.log(`  ✓ Video generated: ${videoUrl}`);
  const videoUpload = await uploadToCloudinary(
    videoUrl,
    `referee-videos/${refereeId}`
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DONE — paste into lib/stats-mock.ts REFEREE_IMAGES:`);
  console.log(`${"=".repeat(60)}`);
  console.log(`"${refereeId}": {`);
  console.log(`  photoUrl: "${photoUpload.secure_url}",`);
  console.log(`  hologramUrl: "${hologramUpload.secure_url}",`);
  console.log(`  videoUrl: "${videoUpload.secure_url}",`);
  console.log(`},`);
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
