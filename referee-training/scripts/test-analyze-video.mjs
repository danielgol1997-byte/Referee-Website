#!/usr/bin/env node
/**
 * Smoke test for the Gemini video analysis pipeline.
 * Picks one active video (preferring one with a hand-written description for
 * comparison), runs the same Gemini call the /analyze route makes, and prints
 * the structured result.
 *
 * Usage: node scripts/test-analyze-video.mjs [videoId]
 */

import { readFileSync } from "node:fs";
import { GoogleGenAI, Type, MediaResolution } from "@google/genai";
import { PrismaClient } from "@prisma/client";

// Load .env manually (plain node script, no Next.js env loading)
try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=["']?([^"'\n]*)["']?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const MODEL = "gemini-3.1-pro-preview";
const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const videoIdArg = process.argv[2];

const video = videoIdArg
  ? await prisma.videoClip.findUnique({
      where: { id: videoIdArg },
      select: { id: true, title: true, fileUrl: true, duration: true, canonicalSearchText: true },
    })
  : await prisma.videoClip.findFirst({
      where: { isActive: true, canonicalSearchText: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, fileUrl: true, duration: true, canonicalSearchText: true },
    }) ||
    (await prisma.videoClip.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, fileUrl: true, duration: true, canonicalSearchText: true },
    }));

if (!video) {
  console.error("No video found in the database.");
  process.exit(1);
}

console.log(`Testing with video: "${video.title}" (${video.id})`);
console.log(`File: ${video.fileUrl}`);
console.log(`Duration: ${video.duration}s`);
console.log("");

// 1. Download from Cloudinary
console.log("Downloading video...");
const res = await fetch(video.fileUrl);
if (!res.ok) {
  console.error(`Download failed: ${res.status}`);
  process.exit(1);
}
const buffer = await res.arrayBuffer();
console.log(`Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`);

// 2. Upload to Gemini Files API
console.log("Uploading to Gemini Files API...");
const blob = new Blob([buffer], { type: "video/mp4" });
let file = await ai.files.upload({
  file: blob,
  config: { mimeType: "video/mp4", displayName: "smoke-test-clip" },
});
const deadline = Date.now() + 120_000;
while (file.state === "PROCESSING" && Date.now() < deadline) {
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 2500));
  file = await ai.files.get({ name: file.name });
}
console.log(`\nFile state: ${file.state}`);
if (file.state !== "ACTIVE") process.exit(1);

// 3. Analyze — same shape as the real pipeline (trimmed schema for the smoke test)
const schema = {
  type: Type.OBJECT,
  required: ["visual", "incident", "visualNarrative"],
  properties: {
    visual: {
      type: Type.OBJECT,
      required: ["attackingTeamColors", "defendingTeamColors", "cameraAngle", "onScreenCardShown"],
      properties: {
        attackingTeamColors: { type: Type.STRING },
        defendingTeamColors: { type: Type.STRING },
        identifiedTeams: { type: Type.STRING, nullable: true },
        competitionOrLeague: { type: Type.STRING, nullable: true },
        onScreenText: { type: Type.STRING, nullable: true },
        cameraAngle: { type: Type.STRING },
        onScreenCardShown: { type: Type.STRING, enum: ["none", "yellow", "red"] },
      },
    },
    incident: {
      type: Type.OBJECT,
      required: ["actionDescription", "pitchLocation", "refereePosition"],
      properties: {
        actionDescription: { type: Type.STRING },
        pitchLocation: { type: Type.STRING },
        refereePosition: { type: Type.STRING },
      },
    },
    visualNarrative: { type: Type.STRING },
  },
};

console.log("Calling Gemini 3.1 Pro (with search grounding + structured output)...");
const start = Date.now();
let usedTools = true;
let response;
try {
  response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
          {
            text: `Analyze this football referee training clip titled "${video.title}". Report kit colours, identified teams/competition ONLY if visible evidence exists (else null), camera angle, any card shown, the incident action, pitch location, referee position, and an exhaustive 200-400 word facts-only visualNarrative covering every visible searchable detail. Structured fields: null over guessing.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      tools: [{ googleSearch: {} }],
    },
  });
} catch (err) {
  console.warn(`Tools + schema combo failed (${err.message}), retrying without tools...`);
  usedTools = false;
  response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
          {
            text: `Analyze this football referee training clip titled "${video.title}". Report kit colours, identified teams/competition ONLY if visible evidence exists (else null), camera angle, any card shown, the incident action, pitch location, referee position, and an exhaustive 200-400 word facts-only visualNarrative covering every visible searchable detail. Structured fields: null over guessing.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
    },
  });
}

console.log(`Response in ${((Date.now() - start) / 1000).toFixed(1)}s (search grounding: ${usedTools ? "yes" : "NO - fell back"})`);
console.log("");
console.log("========== GEMINI ANALYSIS ==========");
console.log(JSON.stringify(JSON.parse(response.text), null, 2));

if (video.canonicalSearchText) {
  console.log("");
  console.log("========== HAND-WRITTEN DESCRIPTION (for comparison) ==========");
  console.log(video.canonicalSearchText.slice(0, 1500));
}

ai.files.delete({ name: file.name }).catch(() => {});
await prisma.$disconnect();
